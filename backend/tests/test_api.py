import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
import main


class ArtifactAccessTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.headers = {"x-api-key": main.API_KEY}
        self.temp = tempfile.TemporaryDirectory(dir="uploads")
        self.addCleanup(self.temp.cleanup)
        self.artifact = Path(self.temp.name).resolve().relative_to(Path.cwd()) / "frame.jpg"
        self.artifact.write_bytes(b"artifact")

    def test_private_routes_require_credentials(self):
        for path in ["/api/reports", "/reports", "/api/reports/missing/pdf", f"/{self.artifact.as_posix()}"]:
            self.assertEqual(self.client.get(path).status_code, 401, path)
        self.assertEqual(self.client.post("/api/reports/generate", json={"result": {}}).status_code, 401)
        self.assertEqual(self.client.get("/api/reports", headers=self.headers).status_code, 200)

    def test_signed_urls_are_scoped_and_expire(self):
        url = main.signed_asset_url(self.artifact.as_posix())
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"artifact")
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.assertEqual(self.client.get(url.replace("frame.jpg", "other.jpg")).status_code, 401)
        with patch.object(main.time, "time", return_value=0):
            expired = main.signed_asset_url(self.artifact.as_posix())
        self.assertEqual(self.client.get(expired).status_code, 401)
        self.assertEqual(self.client.get(url.split('?')[0] + '?expires=%C2%B2&token=invalid').status_code, 401)

    def test_status_supplies_signed_media_without_internal_paths(self):
        job = {"status": "completed", "file_path": "private-server-path", "result": {"heatmaps": [self.artifact.as_posix()]}}
        with patch.dict(main.analysis_jobs, {"test-status": job}):
            response = self.client.get("/api/status/test-status", headers=self.headers)
        data = response.json()
        self.assertNotIn("file_path", data)
        self.assertEqual(self.client.get(data["result"]["heatmaps"][0]).status_code, 200)
        self.assertEqual(job["result"]["heatmaps"][0], self.artifact.as_posix())

    def test_report_identifiers_cannot_escape_directory(self):
        response = self.client.post("/api/reports/generate", headers=self.headers, json={"job_id": "../../outside", "result": {}})
        self.assertEqual(response.status_code, 422)

    def test_webp_upload_is_accepted_as_a_still(self):
        import cv2
        import numpy as np
        from pipeline.video_processor import process_video

        ok, image = cv2.imencode(".webp", np.zeros((24, 24, 3), dtype=np.uint8))
        self.assertTrue(ok)
        with patch.object(main, "run_analysis_pipeline"):
            response = self.client.post("/api/analyze", headers=self.headers, files={"file": ("sample.webp", image.tobytes(), "image/webp")})
        self.assertEqual(response.status_code, 200, response.text)
        job_id = response.json()["job_id"]
        upload = Path(main.analysis_jobs[job_id]["file_path"])
        self.addCleanup(upload.unlink, missing_ok=True)
        with patch("pipeline.video_processor.os.makedirs"), \
             patch("pipeline.video_processor.save_optimized_image") as save, \
             patch("pipeline.video_processor.imageio_ffmpeg.get_ffmpeg_exe", return_value="ffmpeg"):
            _, audio = process_video(str(upload), job_id)
        self.assertIsNone(audio)
        save.assert_called_once()
        main.analysis_jobs.pop(job_id, None)

    def test_pdf_regeneration_accepts_signed_exhibits_and_skips_external_files(self):
        import cv2
        import numpy as np
        from pipeline.image_utils import save_optimized_image

        save_optimized_image(str(self.artifact), np.zeros((24, 24, 3), dtype=np.uint8))
        with tempfile.TemporaryDirectory(dir="reports") as report_dir:
            outside = Path(report_dir) / "outside.jpg"
            save_optimized_image(str(outside), np.zeros((24, 24, 3), dtype=np.uint8))
            with patch.object(main, "REPORT_DIR", report_dir), patch("cv2.imread", wraps=cv2.imread) as read:
                response = self.client.post("/api/reports/generate", headers=self.headers, json={
                    "job_id": "pdf-test", "result": {
                        "overall_score": 0.2, "verdict": "Likely Authentic",
                        "heatmaps": [main.signed_asset_url(self.artifact.as_posix()), str(outside)],
                    },
                })
                self.assertEqual(response.status_code, 200, response.text[:100])
                self.assertTrue(response.content.startswith(b"%PDF"))
                self.assertEqual([call.args[0] for call in read.call_args_list], [str(self.artifact.resolve())])
                url = main.signed_asset_url("/api/reports/pdf-test/pdf")
                self.assertEqual(self.client.get(url).status_code, 200)


if __name__ == "__main__":
    unittest.main()

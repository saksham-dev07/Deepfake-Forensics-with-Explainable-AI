import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

export default function ImageDialog({ src, onClose }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(null);
  useEffect(() => { if (src && !ref.current.open) ref.current.showModal(); }, [src]);
  if (!src) return null;
  return <dialog ref={ref} className="image-dialog" aria-labelledby="image-dialog-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) ref.current.close(); }}>
    <div className="image-dialog-toolbar"><h2 id="image-dialog-title">Expanded exhibit</h2><a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><ExternalLink size={15} /> Open image</a><button type="button" className="btn btn-secondary" aria-label="Close expanded image" onClick={() => ref.current.close()}><X size={20} /></button></div>
    {failed === src ? <p className="view-error" role="status">This exhibit could not be loaded. Its access link may have expired.</p> : <img src={src} alt="Expanded analytical exhibit" onError={() => setFailed(src)} />}
  </dialog>;
}

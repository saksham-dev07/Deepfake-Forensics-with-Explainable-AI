import React from 'react';
import { Shield, GitBranch, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="modern-footer">
      <div className="footer-glow"></div>
      <div className="container footer-container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <Shield size={24} color="var(--primary)" />
              <span className="footer-brand-text">Deep<span>Forensics</span></span>
            </div>
            <p className="footer-desc">
              Court-grade multimodal forensic analysis powered by 15 sensory dimensions, EfficientNet-B4 + CBAM, dual-resolution Grad-CAM, SHAP attribution, and an 8-layer Tabular ResNet meta-classifier.
            </p>
          </div>

          {/* Links Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Technology</h4>
            <ul className="footer-links" style={{ color: 'var(--text-muted)' }}>
              <li>EfficientNet-B4 + CBAM</li>
              <li>Dual Grad-CAM &amp; Guided HDR</li>
              <li>Tabular ResNet &amp; SHAP</li>
              <li>15-Sensor Multimodal Pool</li>
              <li>SyncNet &amp; Voice 2D-CNN</li>
            </ul>
          </div>

          {/* Links Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-links">
              <li>
                <a href="https://github.com/saksham-dev07/Deepfake-Forensics-with-Explainable-AI" target="_blank" rel="noopener noreferrer">
                  <GitBranch size={14} style={{ marginRight: '4px' }} /> GitHub Repo <ArrowUpRight size={12} style={{ marginLeft: '4px' }} />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Status</h4>
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">All systems operational</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright">
            &copy; {new Date().getFullYear()} DeepForensics Platform. Version 2.4.0. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

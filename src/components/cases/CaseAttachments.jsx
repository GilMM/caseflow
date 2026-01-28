"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Modal,
  Space,
  Spin,
  Typography,
  Upload,
  message,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  PaperClipOutlined,
  UploadOutlined,
  FilePdfOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(fileType) {
  return !!fileType?.startsWith("image/");
}

function isPdf(fileType, fileName) {
  if (fileType === "application/pdf") return true;
  return String(fileName || "").toLowerCase().endsWith(".pdf");
}

export default function CaseAttachments({
  attachments = [],
  onUpload,
  onDelete,
  uploading = false,
  readOnly = false,
  maxFiles = 10,
}) {
  const t = useTranslations();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const canUpload = !readOnly && !!onUpload && attachments.length < maxFiles;

  const grid = useMemo(() => {
    // newest first if you ever add created_at in attachments
    return Array.isArray(attachments) ? attachments : [];
  }, [attachments]);

  const handlePreview = (att) => {
    setPreviewImage(att.url);
    setPreviewTitle(att.file_name || "Preview");
    setPreviewOpen(true);
  };

  const handleDelete = async (att) => {
    if (!onDelete) return;
    try {
      setDeletingId(att.id);
      await onDelete(att.id);
      message.success(t("attachments.deleted"));
    } catch (e) {
      message.error(e?.message || t("attachments.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const beforeUpload = (file) => {
    const ok =
      file.type?.startsWith("image/") ||
      file.type === "application/pdf" ||
      String(file.name || "").toLowerCase().endsWith(".pdf");

    if (!ok) {
      message.error(t("attachments.invalidType"));
      return Upload.LIST_IGNORE;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t("attachments.tooLarge"));
      return Upload.LIST_IGNORE;
    }

    if (attachments.length >= maxFiles) {
      message.error(t("attachments.maxFilesReached", { max: maxFiles }));
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const customUpload = async ({ file, onSuccess, onError }) => {
    if (!onUpload) {
      onError(new Error("No upload handler"));
      return;
    }

    try {
      const result = await onUpload(file);
      onSuccess(result);
      message.success(t("attachments.uploaded"));
    } catch (e) {
      onError(e);
      message.error(e?.message || t("attachments.uploadFailed"));
    }
  };

  const EmptyState = () => {
    if (readOnly) return null;
    return (
      <Text type="secondary" style={{ fontSize: 13 }}>
        {t("attachments.noAttachments")}
      </Text>
    );
  };

  return (
    <div>
      {/* Scoped styles */}
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .tile {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .tile:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          position: relative;
          cursor: pointer;
          background: rgba(0, 0, 0, 0.12);
        }

        .thumbImg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.45);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .tile:hover .overlay {
          opacity: 1;
        }

        .meta {
          padding: 10px 10px 12px 10px;
          display: grid;
          gap: 4px;
        }

        .fileLine {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .fileName {
          font-size: 12px;
          max-width: 100%;
        }

        .sizeLine {
          font-size: 11px;
          opacity: 0.75;
        }
      `}</style>

      {!grid.length ? (
        <EmptyState />
      ) : (
        <div className="grid">
          {grid.map((att) => {
            const image = isImage(att.file_type);
            const pdf = isPdf(att.file_type, att.file_name);
            const size = formatFileSize(att.file_size);

            return (
              <div key={att.id} className="tile">
                {/* Thumbnail */}
                {image ? (
                  <div className="thumb" onClick={() => handlePreview(att)}>
                    <img className="thumbImg" src={att.url} alt={att.file_name} />
                    <div className="overlay" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={t("common.view") || "View"}>
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(att)}
                        />
                      </Tooltip>

                      <Tooltip title={t("common.download") || "Download"}>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => window.open(att.url, "_blank")}
                        />
                      </Tooltip>

                      {!readOnly && onDelete ? (
                        <Tooltip title={t("common.delete") || "Delete"}>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingId === att.id}
                            onClick={() => handleDelete(att)}
                          />
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    className="thumb"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      cursor: "default",
                    }}
                  >
                    {pdf ? (
                      <FilePdfOutlined style={{ fontSize: 40, opacity: 0.55 }} />
                    ) : (
                      <PaperClipOutlined style={{ fontSize: 40, opacity: 0.55 }} />
                    )}

                    <div className="overlay">
                      <Tooltip title={t("common.view") || "View"}>
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => window.open(att.url, "_blank")}
                        />
                      </Tooltip>

                      <Tooltip title={t("common.download") || "Download"}>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => window.open(att.url, "_blank")}
                        />
                      </Tooltip>

                      {!readOnly && onDelete ? (
                        <Tooltip title={t("common.delete") || "Delete"}>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingId === att.id}
                            onClick={() => handleDelete(att)}
                          />
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="meta">
                  <div className="fileLine">
                    {pdf ? <FilePdfOutlined style={{ opacity: 0.7 }} /> : <PaperClipOutlined style={{ opacity: 0.7 }} />}
                    <Text
                      className="fileName"
                      ellipsis={{ tooltip: att.file_name }}
                      style={{ margin: 0 }}
                    >
                      {att.file_name || "—"}
                    </Text>
                  </div>

                  <Text type="secondary" className="sizeLine" style={{ margin: 0 }}>
                    {size}
                  </Text>

                  <Space size={6} wrap>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => (image ? handlePreview(att) : window.open(att.url, "_blank"))}
                    >
                      {t("common.view") || "View"}
                    </Button>

                    {!readOnly && onDelete ? (
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingId === att.id}
                        onClick={() => handleDelete(att)}
                      >
                        {t("common.delete") || "Delete"}
                      </Button>
                    ) : null}
                  </Space>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload CTA */}
      {canUpload ? (
        <div style={{ marginTop: grid.length ? 12 : 0 }}>
          <Upload
            accept="image/*,.pdf"
            showUploadList={false}
            beforeUpload={beforeUpload}
            customRequest={customUpload}
            disabled={uploading}
            multiple
          >
            <Button
              icon={uploading ? <Spin size="small" /> : <UploadOutlined />}
              disabled={uploading}
              style={{ borderRadius: 12 }}
            >
              {t("attachments.addFiles")}
            </Button>
          </Upload>

          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
            {t("attachments.hint") || "Images and PDF up to 10MB. Max files:"} {maxFiles}
          </Text>
        </div>
      ) : null}

      {/* Image preview */}
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width="80%"
        style={{ maxWidth: 980 }}
      >
        <img alt={previewTitle} style={{ width: "100%", borderRadius: 12 }} src={previewImage} />
      </Modal>
    </div>
  );
}

/** Compact indicator for lists */
export function AttachmentIndicator({ count = 0 }) {
  if (!count) return null;

  return (
    <Space size={4} style={{ opacity: 0.75 }}>
      <PaperClipOutlined style={{ fontSize: 12 }} />
      <Text type="secondary" style={{ fontSize: 12, margin: 0 }}>
        {count}
      </Text>
    </Space>
  );
}

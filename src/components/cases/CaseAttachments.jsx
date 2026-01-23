"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Image,
  Modal,
  Space,
  Spin,
  Typography,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  PaperClipOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

/**
 * Component for uploading and displaying case attachments.
 * Used in both NewCaseForm (upload mode) and CaseDetailsPage (view/upload mode).
 *
 * Props:
 * - attachments: Array of { id, url, file_name, file_type, file_size }
 * - onUpload: async (file) => attachment object - called when file is uploaded
 * - onDelete: async (attachmentId) => void - called when attachment is deleted
 * - uploading: boolean - show loading state
 * - readOnly: boolean - hide upload controls
 * - maxFiles: number - max attachments allowed (default 10)
 */
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

  const isImage = (fileType) => {
    return fileType?.startsWith("image/");
  };

  const handlePreview = (attachment) => {
    setPreviewImage(attachment.url);
    setPreviewTitle(attachment.file_name || "Preview");
    setPreviewOpen(true);
  };

  const handleDelete = async (attachment) => {
    if (!onDelete) return;
    try {
      setDeletingId(attachment.id);
      await onDelete(attachment.id);
      message.success(t("attachments.deleted"));
    } catch (e) {
      message.error(e?.message || t("attachments.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const beforeUpload = (file) => {
    const isValidType =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isValidType) {
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

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Gallery view for existing attachments
  const renderGallery = () => {
    if (!attachments.length) {
      if (readOnly) return null;
      return (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t("attachments.noAttachments")}
        </Text>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 12,
        }}
      >
        {attachments.map((att) => (
          <div
            key={att.id}
            style={{
              position: "relative",
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {isImage(att.file_type) ? (
              <div
                style={{
                  width: "100%",
                  paddingTop: "100%",
                  position: "relative",
                  cursor: "pointer",
                }}
                onClick={() => handlePreview(att)}
              >
                <img
                  src={att.url}
                  alt={att.file_name}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.4)",
                    opacity: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "opacity 0.2s",
                  }}
                  className="attachment-overlay"
                >
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    style={{ color: "#fff" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(att);
                    }}
                  />
                  {!readOnly && onDelete && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deletingId === att.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(att);
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <PaperClipOutlined style={{ fontSize: 32, opacity: 0.5 }} />
                <Text
                  ellipsis={{ tooltip: att.file_name }}
                  style={{ fontSize: 12, maxWidth: "100%" }}
                >
                  {att.file_name}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatFileSize(att.file_size)}
                </Text>
                <Space size={4}>
                  <Button
                    size="small"
                    type="link"
                    icon={<EyeOutlined />}
                    href={att.url}
                    target="_blank"
                  />
                  {!readOnly && onDelete && (
                    <Button
                      size="small"
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deletingId === att.id}
                      onClick={() => handleDelete(att)}
                    />
                  )}
                </Space>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <style jsx global>{`
        .attachment-overlay:hover {
          opacity: 1 !important;
        }
        .attachment-card:hover .attachment-overlay {
          opacity: 1 !important;
        }
      `}</style>

      {renderGallery()}

      {!readOnly && onUpload && attachments.length < maxFiles && (
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
            style={{ marginTop: attachments.length > 0 ? 12 : 0 }}
          >
            {t("attachments.addFiles")}
          </Button>
        </Upload>
      )}

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width="80%"
        style={{ maxWidth: 900 }}
      >
        <img alt={previewTitle} style={{ width: "100%" }} src={previewImage} />
      </Modal>
    </div>
  );
}

/**
 * Compact attachment indicator for case list cards.
 * Shows a small icon with count if case has attachments.
 */
export function AttachmentIndicator({ count = 0 }) {
  const t = useTranslations();

  if (!count) return null;

  return (
    <Space size={4} style={{ opacity: 0.7 }}>
      <PaperClipOutlined style={{ fontSize: 12 }} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        {count}
      </Text>
    </Space>
  );
}

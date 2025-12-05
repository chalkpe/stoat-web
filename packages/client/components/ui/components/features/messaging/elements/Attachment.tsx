import { JSX, Match, Show, Switch } from "solid-js";

import { File, ImageEmbed, Message, VideoEmbed } from "stoat.js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { MessageContextMenu } from "@revolt/app";
import { useModals } from "@revolt/modal";
import { Column } from "@revolt/ui/components/layout";
import { SizedContent, Spoiler } from "@revolt/ui/components/utils";

import { FileInfo } from "./FileInfo";
import { TextFile } from "./TextFile";

/**
 * List of attachments
 */
export const AttachmentContainer = styled(Column, {
  base: {
    padding: "var(--gap-md)",
    borderRadius: "var(--borderRadius-md)",
    color: "var(--md-sys-color-inverse-on-surface)",
    background: "var(--md-sys-color-inverse-surface)",
  },
});

interface AttachmentProps {
  file: File;
  message?: Message;
  /**
   * Thumbnail mode for grid view (used in AttachmentsSidebar)
   */
  thumbnail?: boolean;
  /**
   * Custom context menu (only used in thumbnail mode)
   */
  contextMenu?: () => JSX.Element;
  /**
   * Channel ID for image viewer navigation
   */
  channelId?: string;
  /**
   * Message ID for image viewer navigation
   */
  messageId?: string;
}

/**
 * Render a given list of files
 */
export function Attachment(props: AttachmentProps) {
  const { openModal } = useModals();

  const isImage = () =>
    props.file.metadata.type === "Image" ||
    props.file.contentType?.startsWith("image/");

  const isVideo = () =>
    props.file.metadata.type === "Video" ||
    props.file.contentType?.startsWith("video/");

  // Default context menu using MessageContextMenu
  const defaultContextMenu = () => (
    <MessageContextMenu message={props.message} file={props.file} />
  );

  const contextMenu = () => props.contextMenu ?? defaultContextMenu;

  return (
    <Show
      when={!props.thumbnail}
      fallback={
        // Thumbnail mode for grid view - only show images and videos
        <Show when={isImage() || isVideo()}>
          <ThumbnailContainer>
            <Show
              when={isVideo()}
              fallback={
                <img
                  class={thumbnailMediaStyle}
                  src={`${props.file.previewUrl}?max_side=128`}
                  alt={props.file.filename || "Attachment"}
                  loading="lazy"
                  onClick={() =>
                    openModal({
                      type: "image_viewer",
                      file: props.file,
                      channelId: props.channelId,
                      messageId: props.messageId,
                      messageAttachments: props.message?.attachments,
                    })
                  }
                  use:floating={{ contextMenu: contextMenu() }}
                />
              }
            >
              <video
                class={thumbnailMediaStyle}
                src={props.file.previewUrl}
                preload="metadata"
                onClick={(e) => {
                  e.preventDefault();
                  openModal({
                    type: "image_viewer",
                    file: props.file,
                    channelId: props.channelId,
                    messageId: props.messageId,
                    messageAttachments: props.message?.attachments,
                  });
                }}
                use:floating={{ contextMenu: contextMenu() }}
              />
              <VideoOverlay>▶</VideoOverlay>
            </Show>
          </ThumbnailContainer>
        </Show>
      }
    >
      {/* Full attachment view */}
      <Switch fallback={`Could not render ${props.file.metadata.type}!`}>
        <Match when={props.file.metadata.type === "Image"}>
          <SizedContent
            width={(props.file.metadata as ImageEmbed).width}
            height={(props.file.metadata as ImageEmbed).height}
          >
            <Show when={props.file.isSpoiler}>
              <Spoiler contentType="Image" />
            </Show>
            <img
              class={css({ cursor: "pointer" })}
              onClick={() =>
                openModal({
                  type: "image_viewer",
                  file: props.file,
                  channelId: props.message?.channelId,
                  messageId: props.message?.id,
                  messageAttachments: props.message?.attachments,
                })
              }
              loading="lazy"
              src={props.file.createFileURL()}
              use:floating={{ contextMenu: defaultContextMenu }}
            />
          </SizedContent>
        </Match>
        <Match when={props.file.metadata.type === "Video"}>
          <SizedContent
            width={(props.file.metadata as VideoEmbed).width}
            height={(props.file.metadata as VideoEmbed).height}
          >
            <Show when={props.file.isSpoiler}>
              <Spoiler contentType="Video" />
            </Show>
            <video
              controls
              preload="metadata"
              src={props.file.originalUrl}
              use:floating={{ contextMenu: defaultContextMenu }}
            />
          </SizedContent>
        </Match>
        <Match when={props.file.metadata.type === "Audio"}>
          <AttachmentContainer>
            <FileInfo file={props.file} />
            <SizedContent width={360} height={48}>
              <audio
                controls
                src={props.file.originalUrl}
                use:floating={{ contextMenu: defaultContextMenu }}
              />
            </SizedContent>
          </AttachmentContainer>
        </Match>
        <Match when={props.file.metadata.type === "File"}>
          <AttachmentContainer>
            <FileInfo file={props.file} />
          </AttachmentContainer>
        </Match>
        <Match when={props.file.metadata.type === "Text"}>
          <AttachmentContainer>
            <FileInfo file={props.file} />
            <SizedContent width={480} height={120}>
              <TextFile file={props.file} />
            </SizedContent>
          </AttachmentContainer>
        </Match>
      </Switch>
    </Show>
  );
}

/**
 * Thumbnail container for grid view
 */
const ThumbnailContainer = styled("div", {
  base: {
    position: "relative",
    aspectRatio: "1",
    overflow: "hidden",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-container)",
    cursor: "pointer",
    transition: "transform 0.15s ease, opacity 0.15s ease",

    "&:hover": {
      transform: "scale(1.02)",
      opacity: 0.9,
    },
  },
});

const thumbnailMediaStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  cursor: "pointer",
});

/**
 * Video play overlay
 */
const VideoOverlay = styled("div", {
  base: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.3)",
    color: "white",
    fontSize: "24px",
    pointerEvents: "none",
  },
});

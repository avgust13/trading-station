"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import type { BlotterApiError, Exchange, Fill, ParseResponse } from "@/lib/blotter/types";
import { resolveTz, todayKey, TZ_OPTIONS, type TzMode } from "@/lib/calendar/datetime";
import { ReviewFills } from "./ReviewFills";

const LAST_EXCHANGE_KEY = "blotter-last-exchange";

export interface PastedImage {
  dataUrl: string;
  mime: string;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(0, 0, 0, 0.6);
  overflow-y: auto;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 680px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.accent};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  margin: 0;
  flex: 1;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 18px;
  font-weight: 700;
`;

const CloseBtn = styled.button`
  appearance: none;
  cursor: pointer;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 16px;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Body = styled.div`
  padding: 16px 18px 20px;
`;

const DropZone = styled.div<{ $drag: boolean }>`
  border: 1.5px dashed
    ${({ theme, $drag }) => ($drag ? theme.colors.accent : theme.colors.border)};
  border-radius: 10px;
  padding: 22px 14px;
  margin-bottom: 12px;
  text-align: center;
  cursor: pointer;
  background: ${({ theme, $drag }) => ($drag ? `${theme.colors.accent}14` : "transparent")};
  transition:
    border-color 120ms ease,
    background 120ms ease;

  &:hover {
    border-color: ${({ theme }) => `${theme.colors.accent}88`};
  }
`;

const ZoneIcon = styled.div`
  font-size: 22px;
  line-height: 1;
  margin-bottom: 8px;
`;

const ZoneHint = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12.5px;
  line-height: 1.6;
`;

const ZoneKbd = styled.span`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11.5px;
  padding: 1px 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom-width: 2px;
  border-radius: 5px;
`;

const OrDivider = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  margin: 12px 0 8px;
`;

const Preview = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;

  img {
    max-width: 100%;
    max-height: 240px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    display: block;
  }
`;

const RemoveImgBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  appearance: none;
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 110px;
  margin-bottom: 14px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
  margin-bottom: 16px;
`;

const Field = styled.div`
  display: grid;
  gap: 5px;
`;

const FieldLabel = styled.label`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const DateInput = styled.input`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  color-scheme: dark;
`;

const TzSelect = styled.select`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
`;

const PrimaryBtn = styled.button`
  appearance: none;
  cursor: pointer;
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => `${theme.colors.accent}22`};
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: ${({ theme }) => `${theme.colors.accent}33`};
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const ErrorStrip = styled.div`
  margin-top: 12px;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => `${theme.colors.red}55`};
  background: ${({ theme }) => `${theme.colors.red}14`};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.5;
`;

const NoExchanges = styled.div`
  text-align: center;
  padding: 16px 8px 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13.5px;
  line-height: 1.6;

  p {
    margin: 0 0 14px;
  }
`;

export function readImageFile(file: File, cb: (img: PastedImage) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      cb({ dataUrl: reader.result, mime: file.type || "image/png" });
    }
  };
  reader.readAsDataURL(file);
}

/** First image becomes the screenshot; a lone text file lands in the textarea. */
function pickDroppedFile(
  files: FileList | null,
  onImage: (img: PastedImage) => void,
  onText: (text: string) => void,
) {
  if (!files || files.length === 0) return;
  const list = Array.from(files);
  const image = list.find((f) => f.type.startsWith("image/"));
  if (image) {
    readImageFile(image, onImage);
    return;
  }
  const textFile = list.find(
    (f) => f.type.startsWith("text/") || /\.(txt|csv|tsv|log)$/i.test(f.name),
  );
  if (textFile) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onText(reader.result);
    };
    reader.readAsText(textFile);
  }
}

export function ImportPanel({
  exchanges,
  existingIds,
  initialImage,
  onAdd,
  onManageExchanges,
  onClose,
}: {
  exchanges: Exchange[];
  existingIds: Set<string>;
  initialImage: PastedImage | null;
  onAdd: (fills: Fill[]) => void;
  onManageExchanges: () => void;
  onClose: () => void;
}) {
  const [image, setImage] = useState<PastedImage | null>(initialImage);
  const [text, setText] = useState("");
  const [dateKey, setDateKey] = useState(() => todayKey("local"));
  const [tzMode, setTzMode] = useState<TzMode>("newYork");
  const [exchangeId, setExchangeId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default the exchange picker to the last-used one (if it still exists),
  // otherwise the first exchange. Re-runs when the exchange list changes.
  useEffect(() => {
    if (exchanges.length === 0) {
      setExchangeId("");
      return;
    }
    setExchangeId((cur) => {
      if (cur && exchanges.some((e) => e.id === cur)) return cur;
      const last = typeof window !== "undefined" ? localStorage.getItem(LAST_EXCHANGE_KEY) : null;
      if (last && exchanges.some((e) => e.id === last)) return last;
      return exchanges[0].id;
    });
  }, [exchanges]);

  // Catch image pastes anywhere in the modal (the textarea handles text itself).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            readImageFile(file, setImage);
          }
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // While the modal is open, accept file drops anywhere on the screen — a drop
  // that misses the zone must not make the browser navigate to the file.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      setDragging(false);
      pickDroppedFile(e.dataTransfer.files, setImage, setText);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const recognize = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const body = image
        ? { imageBase64: image.dataUrl.split(",")[1], imageMimeType: image.mime }
        : { text };
      const res = await fetch("/api/blotter/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ParseResponse | BlotterApiError;
      if (!res.ok || "error" in json) {
        setError("error" in json ? json.error : "Не удалось распознать сделки.");
        return;
      }
      if (json.fills.length === 0) {
        setError("Не найдено ни одного исполнения. Проверьте вставленные данные.");
        return;
      }
      if (exchangeId) localStorage.setItem(LAST_EXCHANGE_KEY, exchangeId);
      setParsed(json);
    } catch {
      setError("Не удалось распознать сделки. Проверьте соединение.");
    } finally {
      setBusy(false);
    }
  }, [image, text, exchangeId]);

  const hasExchanges = exchanges.length > 0;
  const canRecognize =
    !busy && hasExchanges && exchangeId !== "" && (image !== null || text.trim().length > 0);

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label="Импорт сделок">
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>{parsed ? "Проверьте распознанные исполнения" : "Импорт сделок"}</Title>
          <CloseBtn type="button" onClick={onClose} aria-label="Закрыть">
            ✕
          </CloseBtn>
        </Head>
        <Body>
          {parsed ? (
            <ReviewFills
              parsed={parsed.fills}
              notes={parsed.notes}
              exchangeId={exchangeId}
              dateKey={dateKey}
              zone={resolveTz(tzMode)}
              existingIds={existingIds}
              onConfirm={onAdd}
              onBack={() => setParsed(null)}
            />
          ) : !hasExchanges ? (
            <NoExchanges>
              <p>Чтобы импортировать сделки, сначала добавьте хотя бы одну биржу с её капиталом.</p>
              <PrimaryBtn type="button" onClick={onManageExchanges}>
                + Добавить биржу
              </PrimaryBtn>
            </NoExchanges>
          ) : (
            <>
              <Controls>
                <Field>
                  <FieldLabel htmlFor="blotter-exchange">Биржа</FieldLabel>
                  <TzSelect
                    id="blotter-exchange"
                    value={exchangeId}
                    onChange={(e) => setExchangeId(e.target.value)}
                  >
                    {exchanges.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </TzSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="blotter-date">Дата сделок</FieldLabel>
                  <DateInput
                    id="blotter-date"
                    type="date"
                    value={dateKey}
                    onChange={(e) => setDateKey(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="blotter-tz">Часовой пояс времени</FieldLabel>
                  <TzSelect
                    id="blotter-tz"
                    value={tzMode}
                    onChange={(e) => setTzMode(e.target.value as TzMode)}
                  >
                    {TZ_OPTIONS.map((o) => (
                      <option key={o.mode} value={o.mode}>
                        {o.label}
                      </option>
                    ))}
                  </TzSelect>
                </Field>
              </Controls>

              <DropZone
                $drag={dragging}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickDroppedFile(e.dataTransfer.files, setImage, setText);
                }}
              >
                {image ? (
                  <Preview onClick={(e) => e.stopPropagation()}>
                    <img src={image.dataUrl} alt="Скриншот ордеров" />
                    <RemoveImgBtn
                      type="button"
                      onClick={() => setImage(null)}
                      aria-label="Убрать скриншот"
                    >
                      ✕
                    </RemoveImgBtn>
                  </Preview>
                ) : (
                  <>
                    <ZoneIcon>🖼️</ZoneIcon>
                    <ZoneHint>
                      Перетащите скриншот ордеров сюда, вставьте из буфера <ZoneKbd>Ctrl+V</ZoneKbd>
                      <br />
                      или нажмите, чтобы выбрать файл
                    </ZoneHint>
                  </>
                )}
                <HiddenFileInput
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.txt,.csv,.tsv,.log"
                  onChange={(e) => {
                    pickDroppedFile(e.target.files, setImage, setText);
                    e.target.value = "";
                  }}
                />
              </DropZone>

              {!image && (
                <>
                  <OrDivider>или текст</OrDivider>
                  <TextArea
                    value={text}
                    placeholder={
                      "AMD  Sell  Market  10.00  512.59  Filled  10.00  09:58:30\nAMD  Buy   Market  10.00  506.65  Filled  10.00  09:38:13"
                    }
                    onChange={(e) => setText(e.target.value)}
                  />
                </>
              )}

              <PrimaryBtn type="button" disabled={!canRecognize} onClick={recognize}>
                {busy ? "Распознаю…" : "Распознать"}
              </PrimaryBtn>

              {error && <ErrorStrip>{error}</ErrorStrip>}
            </>
          )}
        </Body>
      </Dialog>
    </Overlay>
  );
}

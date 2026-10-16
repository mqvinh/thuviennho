"use client";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { LoadingIndicator } from "./loading-indicator";
import { ListeningIcon } from "./listening-icon";
import type { Sentence } from "@/lib/library";
import { waitForVoice } from "@/lib/browser-voice";
export type AudioPlayerHandle = { stop: () => void };
export function AudioPlayer({
  sentences,
  onActive,
  controlRef,
}: {
  sentences: Sentence[];
  onActive: (index: number | null) => void;
  controlRef?: Ref<AudioPlayerHandle>;
}) {
  const [source, setSource] = useState<"auto" | "recorded" | "browser">("auto");
  const sourceRef = useRef(source);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const languageRef = useRef(language);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [rate, setRate] = useState(0.85);
  const rateRef = useRef(rate);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const waiting = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const running = useRef(false);
  const activeRef = useRef(onActive);
  const playlist = useRef(sentences);
  useEffect(() => {
    activeRef.current = onActive;
    playlist.current = sentences;
  }, [onActive, sentences]);
  useEffect(
    () => () => {
      generation.current++;
      running.current = false;
      waiting.current?.abort();
      audio.current?.pause();
      if (utterance.current && typeof speechSynthesis !== "undefined")
        speechSynthesis.cancel();
    },
    [],
  );
  function clear() {
    generation.current++;
    waiting.current?.abort();
    waiting.current = null;
    running.current = false;
    audio.current?.pause();
    audio.current = null;
    if (utterance.current && typeof speechSynthesis !== "undefined") {
      utterance.current = null;
      speechSynthesis.cancel();
    }
    setPlaying(false);
    setLoading(false);
    setCompleted(false);
    setPosition(0);
    setDuration(0);
    activeRef.current(null);
  }
  useImperativeHandle(controlRef, () => ({ stop: clear }));
  async function play(selected: number) {
    clear();
    const current = generation.current;
    const sentence = playlist.current[selected];
    if (!sentence) {
      setMessage("Em đã nghe xong truyện!");
      setCompleted(true);
      return;
    }
    setIndex(selected);
    setMessage("");
    const path = languageRef.current === "vi" ? sentence.audio_vi_path : sentence.audio_en_path;
    const useRecording = sourceRef.current === "recorded" || (sourceRef.current === "auto" && !!path);
    if (!useRecording) {
      const controller = new AbortController();
      waiting.current = controller;
      setLoading(true);
      try {
        const voice = await waitForVoice(
          languageRef.current,
          controller.signal,
        );
        if (generation.current !== current) return;
        waiting.current = null;
        setLoading(false);
        const content =
          languageRef.current === "vi" ? sentence.text_vi : sentence.text_en;
        if (!content) {
          setMessage("Câu này chưa có bản dịch để đọc.");
          return;
        }
        const next = new SpeechSynthesisUtterance(content);
        utterance.current = next;
        next.lang = voice.lang;
        next.voice = voice;
        next.rate = rateRef.current;
        running.current = true;
        setPlaying(true);
        activeRef.current(sentence.sequence_no);
        next.onend = () => {
          if (
            running.current &&
            generation.current === current &&
            utterance.current === next
          )
            void play(selected + 1);
        };
        next.onerror = () => {
          if (generation.current === current && utterance.current === next) {
            clear();
            setMessage(
              "Giọng đọc chưa phát được. Em thử lại hoặc tiếp tục đọc nhé!",
            );
          }
        };
        speechSynthesis.cancel();
        speechSynthesis.speak(next);
      } catch (error) {
        if (generation.current !== current) return;
        waiting.current = null;
        setLoading(false);
        setMessage(
          error instanceof Error ? error.message : "Chưa tải được giọng đọc.",
        );
      }
      return;
    }
    if (!path) {
      setMessage(
        `Câu ${sentence.sequence_no} chưa có audio ${languageRef.current === "vi" ? "tiếng Việt" : "tiếng Anh"}. Em vẫn có thể đọc truyện nhé!`,
      );
      return;
    }
    const next = new Audio(path);
    audio.current = next;
    next.playbackRate = rateRef.current;
    running.current = true;
    setPlaying(true);
    activeRef.current(sentence.sequence_no);
    next.onloadedmetadata = () => {
      if (generation.current === current && Number.isFinite(next.duration))
        setDuration(next.duration);
    };
    next.ontimeupdate = () => {
      if (generation.current === current) setPosition(next.currentTime);
    };
    next.onended = () => {
      if (
        running.current &&
        generation.current === current &&
        audio.current === next
      )
        void play(selected + 1);
    };
    next.onerror = () => {
      if (generation.current === current) {
        clear();
        setMessage("Chưa tải được audio. Em thử lại hoặc tiếp tục đọc nhé!");
      }
    };
    try {
      await next.play();
    } catch {
      if (generation.current === current) {
        clear();
        setMessage("Chưa phát được audio. Em chạm Nghe lại câu để thử nhé!");
      }
    }
  }
  function selectLanguage(value: "vi" | "en") {
    if (value === language) return;
    clear(); languageRef.current = value; setLanguage(value); setMessage("");
  }
  function selectSentence(value: number) {
    if (value === index) return;
    const continuePlaying = playing || loading;
    clear(); setIndex(value); setMessage("");
    if (continuePlaying) void play(value);
  }
  function selectRate(value: number) {
    if (value === rate) return;
    const continuePlaying = playing || loading;
    clear(); rateRef.current = value; setRate(value); setMessage("");
    if (continuePlaying) void play(index);
  }
  function selectSource(value: "auto" | "recorded" | "browser") {
    if (value === source) return;
    clear(); sourceRef.current = value; setSource(value); setMessage("");
  }
  const currentSentence = sentences[index];
  const listening = playing || loading;
  return (
    <section id="audio" className="panel listening-player" aria-label="Nghe sách">
      <div className="listening-heading">
        <span className="listening-symbol" aria-hidden="true"><ListeningIcon name="headphones" /></span>
        <div><h2>Cùng nghe truyện</h2><p>Chọn ngôn ngữ rồi chạm nút nghe nhé!</p></div>
      </div>
      <div className="listening-languages" role="group" aria-label="Ngôn ngữ audio">
        {([{ value: "vi", label: "Tiếng Việt", icon: "VI" }, { value: "en", label: "Tiếng Anh", icon: "EN" }] as const).map(option =>
          <button type="button" key={option.value} className="listening-language" aria-pressed={language === option.value} onClick={() => selectLanguage(option.value)}>
            <span aria-hidden="true">{option.icon}</span>{option.label}
          </button>)}
      </div>
      <div className="listening-current">
        <div className="listening-progress-label"><strong>{sentences.length ? "Câu " + (index + 1) + " trên " + sentences.length : "Chưa có câu để nghe"}</strong><span>{language === "vi" ? "Tiếng Việt" : "Tiếng Anh"}</span></div>
        <progress value={sentences.length ? index + 1 : 0} max={Math.max(1, sentences.length)} aria-label="Tiến độ nghe truyện" />
        <p lang={language}>{(language === "vi" ? currentSentence?.text_vi : currentSentence?.text_en) || "Nội dung đang được chuẩn bị."}</p>
      </div>
      <div className="listening-workspace">
        <div className="listening-sentence-picker">
          <h3 className="listening-label"><ListeningIcon name="book" />Chọn câu để nghe</h3>
          <div className="listening-sentence-grid" role="group" aria-label="Chọn câu để nghe">
            {sentences.map((sentence, i) => (
              <button type="button" key={sentence.sequence_no} className="listening-sentence" aria-pressed={index === i} onClick={() => selectSentence(i)}>
                Câu {sentence.sequence_no}
              </button>
            ))}
          </div>
          {!sentences.length && <p className="muted">Các câu đang được chuẩn bị.</p>}
          <div className="listening-art" aria-hidden="true" />
        </div>
        <div className="listening-actions">
          <div className="listening-transport">
            <button type="button" className="button listening-play" disabled={!sentences.length} aria-busy={loading} aria-label={listening ? "Dừng nghe" : completed ? "Nghe lại truyện" : "Nghe truyện"} onClick={() => {
              if (listening) { clear(); setMessage(""); }
              else void play(completed ? 0 : index);
            }}>
              {loading ? <LoadingIndicator inline label="Đang chuẩn bị giọng đọc" /> : <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d={listening ? "M5 5h14v14H5Z" : "M7 4l14 8-14 8Z"} /></svg>}
              {listening ? "Dừng nghe" : completed ? "Nghe lại truyện" : "Nghe truyện"}
            </button>
            <button type="button" className="button secondary listening-replay" disabled={!sentences.length || loading} onClick={() => void play(index)}><ListeningIcon name="replay" />Nghe lại câu</button>
          </div>
          {duration > 0 && <label className="listening-seek">Vị trí trong câu đang nghe<input aria-label="Vị trí trong câu đang nghe" type="range" min={0} max={duration} step={0.1} value={position} onChange={event => {
            if (audio.current) { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }
          }} /><span>{Math.floor(position)} / {Math.ceil(duration)} giây</span></label>}
          <div className="listening-option listening-speed"><span className="listening-label"><ListeningIcon name="speed" />Tốc độ nghe</span><div role="group" aria-label="Tốc độ nghe">
            {[{ value: .75, label: "Chậm" }, { value: .85, label: "Vừa" }, { value: 1, label: "Nhanh" }].map(option =>
              <button type="button" key={option.value} className="button secondary" aria-pressed={rate === option.value} onClick={() => selectRate(option.value)}>{option.label}</button>)}
          </div></div>
          <div className="listening-option listening-source"><span className="listening-label"><ListeningIcon name="voice" />Nguồn giọng đọc</span><div role="group" aria-label="Nguồn giọng đọc">
            {([{ value: "auto", label: "Tự chọn" }, { value: "recorded", label: "Bản thu âm" }, { value: "browser", label: "Giọng máy" }] as const).map(option =>
              <button type="button" key={option.value} className="button secondary" aria-pressed={source === option.value} onClick={() => selectSource(option.value)}>{option.label}</button>)}
          </div></div>
        </div>
      </div>
      <p className="listening-status" role="status"><ListeningIcon name="tip" /><span>{message || (loading ? <LoadingIndicator inline label="Đang tải giọng đọc trên thiết bị" /> : playing ? "Đang nghe câu " + currentSentence?.sequence_no : "Em có thể vừa nghe vừa đọc các câu bên dưới.")}</span></p>
    </section>
  );
}

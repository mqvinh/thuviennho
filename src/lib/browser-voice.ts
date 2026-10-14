export function waitForVoice(
  language: "vi" | "en",
  signal: AbortSignal,
): Promise<SpeechSynthesisVoice> {
  if (typeof speechSynthesis === "undefined")
    return Promise.reject(
      Error(
        "Trình duyệt này chưa hỗ trợ giọng đọc. Em có thể dùng audio thu âm.",
      ),
    );
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      speechSynthesis.removeEventListener("voiceschanged", check);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Đã dừng chờ giọng đọc.", "AbortError"));
    };
    const check = () => {
      const voices = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === language);
      const voice = voices.find((v) => v.localService) || voices[0];
      if (voice) {
        cleanup();
        resolve(voice);
        return true;
      }
      return false;
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        Error(
          `Thiết bị chưa có giọng ${language === "vi" ? "tiếng Việt" : "tiếng Anh"}. Em chọn ngôn ngữ khác hoặc audio thu âm nhé!`,
        ),
      );
    }, 4000);
    if (signal.aborted) {
      abort();
      return;
    }
    if (check()) return;
    speechSynthesis.addEventListener("voiceschanged", check);
    signal.addEventListener("abort", abort, { once: true });
  });
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { ListeningIcon } from "./listening-icon";

type GameImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  loading?: "eager" | "lazy";
  onError?: () => void;
};

export function GameImage(props: GameImageProps) {
  // Each new picture gets its own load state, even when the card is reused.
  return <GameImageFrame key={props.src} {...props} />;
}

function GameImageFrame({ src, alt, width, height, loading, onError }: GameImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  return <span className="game-image" data-state={state} aria-busy={state === "loading"}>
    <Image src={src} alt={alt} width={width} height={height} unoptimized loading={loading} draggable={false}
      onLoad={() => setState("loaded")}
      onError={() => { setState("error"); onError?.(); }} />
    {state !== "loaded" && <span className={`game-image-placeholder${state === "error" ? " is-error" : ""}`} role="status">
      {state === "loading" ? <span className="game-image-spinner" aria-hidden="true" /> : <ListeningIcon name="image" />}
      <span className="game-image-status-text">{state === "loading" ? "Đang tải ảnh…" : "Chưa tải được ảnh"}</span>
    </span>}
  </span>;
}

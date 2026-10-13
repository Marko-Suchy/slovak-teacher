import { useEffect, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import {
  buildVoiceInstructions,
  transcriptFromHistory,
  type VoiceStory,
  type VoiceTranscriptLine,
} from "../lib/voice";

interface VoiceTutorProps {
  story: VoiceStory;
  selectedText?: string;
  question?: string;
}

type VoiceStatus = "idle" | "connecting" | "connected" | "ended";

function errorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Microphone access was denied. Allow it in your browser settings, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No microphone was found. Connect one, then try again.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "The voice connection could not start. Please try again.";
}

export default function VoiceTutor({ story, selectedText, question }: VoiceTutorProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<VoiceTranscriptLine[]>([]);
  const [muted, setMuted] = useState(false);
  const [canMute, setCanMute] = useState(false);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      attemptRef.current += 1;
      requestRef.current?.abort();
      requestRef.current = null;
      const session = sessionRef.current;
      sessionRef.current = null;
      session?.close();
    };
  }, [story.id]);

  useEffect(() => {
    setStatus("idle");
    setError(null);
    setTranscript([]);
    setMuted(false);
    setCanMute(false);
  }, [story.id]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [transcript]);

  async function start() {
    if (status === "connecting" || status === "connected" || requestRef.current || sessionRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice needs a browser with microphone support on localhost or HTTPS.");
      return;
    }

    const attempt = ++attemptRef.current;
    const request = new AbortController();
    requestRef.current = request;
    setError(null);
    setTranscript([]);
    setMuted(false);
    setCanMute(false);
    setStatus("connecting");

    try {
      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
        signal: request.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      const payload = body && typeof body === "object" ? body as Record<string, unknown> : null;
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Could not create a voice session.");
      }
      if (typeof payload?.clientSecret !== "string" || !payload.clientSecret) {
        throw new Error("The server did not return a valid voice session credential.");
      }
      if (attempt !== attemptRef.current) return;

      const agent = new RealtimeAgent({
        name: "Slovak story tutor",
        instructions: buildVoiceInstructions(story, selectedText, question),
        voice: "marin",
      });
      const session = new RealtimeSession(agent, {
        model: typeof payload.model === "string" && payload.model.trim() ? payload.model : "gpt-realtime-2.1",
        config: {
          outputModalities: ["audio"],
          audio: {
            input: {
              turnDetection: { type: "server_vad", threshold: 0.75 },
              transcription: {
                model: "gpt-live-transcribe",
                prompt: "A Slovak A1 learner talks about a short Slovak story, sometimes asking for an English explanation.",
              },
            },
          },
        },
      });
      sessionRef.current = session;
      session.on("history_updated", (history) => {
        if (sessionRef.current === session) setTranscript(transcriptFromHistory(history));
      });
      session.on("error", (sessionError) => {
        if (sessionRef.current === session) setError(errorMessage(sessionError));
      });
      session.transport.on("connection_change", (connectionStatus) => {
        if (sessionRef.current !== session) return;
        if (connectionStatus === "disconnected") {
          sessionRef.current = null;
          setStatus("ended");
          setMuted(false);
          setCanMute(false);
          setError("The voice connection ended. You can start a new conversation.");
        }
      });

      await session.connect({ apiKey: payload.clientSecret });
      if (attempt !== attemptRef.current) {
        session.close();
        return;
      }
      requestRef.current = null;
      setCanMute(session.muted !== null);
      setMuted(session.muted === true);
      setStatus("connected");
      if (question?.trim()) session.sendMessage("Please ask me the current comprehension question aloud in Slovak, then wait for my answer.");
    } catch (connectionError) {
      if (attempt !== attemptRef.current) return;
      const session = sessionRef.current;
      sessionRef.current = null;
      session?.close();
      requestRef.current = null;
      setStatus("idle");
      setError(errorMessage(connectionError));
    }
  }

  function stop() {
    attemptRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    setStatus("ended");
    setError(null);
    setMuted(false);
    setCanMute(false);
  }

  function toggleMute() {
    const session = sessionRef.current;
    if (!session || session.muted === null) return;
    try {
      session.mute(!session.muted);
      setMuted(session.muted === true);
    } catch (muteError) {
      setError(errorMessage(muteError));
    }
  }

  const active = status === "connecting" || status === "connected";
  const statusText = {
    idle: "Ready when you are",
    connecting: "Connecting microphone…",
    connected: muted ? "Connected · microphone muted" : "Connected · listening",
    ended: "Conversation ended",
  }[status];

  return (
    <section className="voice-tutor" aria-label="Live voice tutor">
      <div className="voice-tutor__header">
        <div>
          <p className="voice-tutor__eyebrow">SPEAK SLOVAK</p>
          <h3>Voice conversation</h3>
          <p className="voice-tutor__description">{question ? "Answer this story question aloud with your tutor." : `Talk about “${story.title}” with your tutor.`}</p>
        </div>
        <span className={`voice-tutor__status voice-tutor__status--${status}`} role="status">
          {statusText}
        </span>
      </div>

      {selectedText?.trim() && status !== "connected" ? (
        <p className="voice-tutor__selection">Starting with: “{selectedText.trim()}”</p>
      ) : null}

      <div className="voice-tutor__controls">
        {active ? (
          <button type="button" className="voice-tutor__primary" onClick={stop}>
            End conversation
          </button>
        ) : (
          <button type="button" className="voice-tutor__primary" onClick={start}>
            Start talking
          </button>
        )}
        {status === "connected" && canMute ? (
          <button type="button" className="voice-tutor__secondary" onClick={toggleMute} aria-pressed={muted}>
            {muted ? "Unmute mic" : "Mute mic"}
          </button>
        ) : null}
      </div>

      {error ? <p className="voice-tutor__error" role="alert">{error}</p> : null}

      <div className="voice-tutor__transcript" role="log" aria-label="Voice conversation transcript" aria-live="off">
        {transcript.length ? transcript.map((line) => (
          <div key={line.id} className={`voice-tutor__line voice-tutor__line--${line.role}`}>
            <strong>{line.role === "user" ? "You" : "Tutor"}</strong>
            <p>{line.text}</p>
          </div>
        )) : (
          <p className="voice-tutor__empty">Your conversation will appear here as you speak.</p>
        )}
        <div ref={transcriptEndRef} />
      </div>
      <p className="voice-tutor__footnote">AI voice and transcript may make mistakes, especially with pronunciation.</p>
    </section>
  );
}

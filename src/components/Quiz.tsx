import { Suspense, lazy, useState } from "react";
import { Icon } from "./Icon";
import type { Story } from "./types";

const VoiceTutor = lazy(() => import("./VoiceTutor"));

export function Quiz({ story, onDone, onBack }: { story: Story; onDone: (score?: number) => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState(0);
  const [spokenCount, setSpokenCount] = useState(0);
  const [mode, setMode] = useState<"choice" | "voice">("choice");
  const [finished, setFinished] = useState(false);
  const question = story.questions[index];

  function next() {
    if (mode === "choice" && !checked) {
      setChecked(true);
      setMultipleChoiceCount(value => value + 1);
      if (answer === question.answerId) setScore(value => value + 1);
      return;
    }
    if (mode === "voice") setSpokenCount(value => value + 1);
    if (index === story.questions.length - 1) {
      setFinished(true);
      onDone(spokenCount > 0 || mode === "voice" ? undefined : score);
    } else { setIndex(value => value + 1); setAnswer(undefined); setChecked(false); setMode("choice"); }
  }

  return <main className="study-panel quiz-panel"><div className="study-top"><button className="back-link" onClick={onBack}>← Back to story</button><span>{story.title}</span></div>
    {finished ? <div className="quiz-result"><div className="result-mark"><Icon name="check" size={34}/></div><h1>Nice work.</h1><p>{multipleChoiceCount ? `${score} of ${multipleChoiceCount} multiple-choice answers correct.` : ""} {spokenCount ? `${spokenCount} question${spokenCount === 1 ? "" : "s"} opened in voice mode (unscored).` : ""}</p><button className="primary-button" onClick={onBack}>Return to the story <Icon name="arrow"/></button></div> : question ? <div className="quiz-content"><p className="quiz-count">Question {index + 1} of {story.questions.length}</p><div className="quiz-progress"><span style={{ width: `${((index + 1) / story.questions.length) * 100}%` }}/></div><h1 lang="sk">{question.promptSk}</h1><div className="quiz-mode" role="tablist" aria-label="Answer method"><button role="tab" aria-selected={mode === "choice"} className={mode === "choice" ? "is-active" : ""} onClick={() => setMode("choice")}>Choose an answer</button><button role="tab" aria-selected={mode === "voice"} className={mode === "voice" ? "is-active" : ""} disabled={checked} onClick={() => setMode("voice")}>Discuss aloud</button></div>{mode === "choice" ? <><div className="answer-options" role="radiogroup" aria-label="Choose an answer">{question.options.map(option => <button key={option.id} role="radio" aria-checked={answer === option.id} onClick={() => { if (!checked) setAnswer(option.id); }} className={`${answer === option.id ? "is-selected" : ""} ${checked && option.id === question.answerId ? "is-correct" : ""}`}><span className="option-letter">{option.id.toUpperCase()}</span><span lang="sk">{option.text}</span></button>)}</div>{checked ? <div className="quiz-feedback" role="status"><strong>{answer === question.answerId ? "Correct." : "The answer is shown above."}</strong><p>{question.explanationEn}</p><blockquote lang="sk">{story.sentences.filter(sentence => question.sourceSentenceIds.includes(sentence.id)).map(sentence => sentence.sk).join(" ")}</blockquote></div> : null}<button className="primary-button" disabled={!answer} onClick={next}>{checked ? index === story.questions.length - 1 ? "Finish questions" : "Next question" : "Check answer"} <Icon name="arrow"/></button></> : <><div className="quiz-voice"><Suspense fallback={<p>Opening voice…</p>}><VoiceTutor key={question.id} story={story} question={question.promptSk}/></Suspense></div><p className="voice-quiz-note">Discuss your answer aloud, then continue when ready. Spoken answers are practice and are not automatically scored.</p><button className="primary-button" onClick={next}>{index === story.questions.length - 1 ? "Finish questions" : "Next question"} <Icon name="arrow"/></button></>}</div> : null}
  </main>;
}

import React, { useState, useEffect, useRef } from 'react';
import { generateRandomWords } from './words';

const THEMES = [
  { id: 'standard-dark', name: 'Standard Dark' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'matrix', name: 'Matrix' },
  { id: 'light', name: 'Light' },
  { id: '8008', name: '8008' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'nord', name: 'Nord' },
  { id: 'midnight', name: 'Midnight' }
];

function App() {
  const [words, setWords] = useState([]);
  const [typedHistory, setTypedHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const [timeLimit, setTimeLimit] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);

  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);

  const [highestWpm, setHighestWpm] = useState(
    parseInt(localStorage.getItem('highestWpm')) || 0
  );

  const [theme, setTheme] = useState(
    localStorage.getItem('typingTheme') || 'standard-dark'
  );

  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef(null);
  const wordsContainerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('typingTheme', theme);
  }, [theme]);

  const initTest = () => {
    clearInterval(timerRef.current);
    const newWords = generateRandomWords(200, includeNumbers, includePunctuation);
    setWords(newWords);
    setTypedHistory(new Array(200).fill(''));
    setCurrentWordIndex(0);
    setCurrentInput('');
    setTimeRemaining(timeLimit);
    setIsActive(false);
    setIsFinished(false);
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    if (wordsContainerRef.current) {
      wordsContainerRef.current.style.transform = `translateY(0px)`;
    }
  };

  useEffect(() => {
    initTest();
  }, [timeLimit, includePunctuation, includeNumbers]);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  useEffect(() => {
    if (isFinished) {
      const timeInMins = timeLimit / 60;
      let accurateChars = 0;

      const fullHistory = [...typedHistory];
      fullHistory[currentWordIndex] = currentInput;

      fullHistory.forEach((typed, i) => {
        if (!typed || !words[i]) return;
        const target = words[i];
        for (let j = 0; j < typed.length; j++) {
          if (typed[j] === target[j]) accurateChars++;
        }
        if (typed === target && i < currentWordIndex) {
          accurateChars++;
        }
      });

      const wpm = Math.max(0, Math.round((accurateChars / 5) / timeInMins));
      if (wpm > highestWpm) {
        setHighestWpm(wpm);
        localStorage.setItem('highestWpm', wpm.toString());
      }
    }
  }, [isFinished]);

  const handleCustomTime = () => {
    let val = prompt("Enter custom test time in seconds:", timeLimit);
    if (val !== null) {
      let time = parseInt(val, 10);
      if (!isNaN(time) && time > 0) {
        setTimeLimit(time);
      }
    }
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (isFinished) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      initTest();
      return;
    }
    if (!isActive && e.key.length === 1) {
      setIsActive(true);
    }

    if (e.key === 'Backspace') {
      if (e.ctrlKey) {
        setCurrentInput('');
      } else if (currentInput.length > 0) {
        setCurrentInput(prev => prev.slice(0, -1));
      } else if (currentWordIndex > 0) {
        const prevTyped = typedHistory[currentWordIndex - 1];
        const prevTarget = words[currentWordIndex - 1];
        if (prevTyped !== prevTarget) {
          setCurrentWordIndex(prev => prev - 1);
          setCurrentInput(prevTyped);
        }
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentInput.length > 0 || currentWordIndex > 0) {
        setTotalKeystrokes(prev => prev + 1);
        setCorrectKeystrokes(prev => prev + 1);
        const newHistory = [...typedHistory];
        newHistory[currentWordIndex] = currentInput;
        setTypedHistory(newHistory);
        setCurrentWordIndex(prev => prev + 1);
        setCurrentInput('');

        if (wordsContainerRef.current) {
          const currentWordEl = wordsContainerRef.current.children[currentWordIndex];
          if (currentWordEl) {
            const top = currentWordEl.offsetTop;
            if (top > 70) {
              const currTr = parseInt(wordsContainerRef.current.style.transform.replace('translateY(', '').replace('px)', '') || '0');
              wordsContainerRef.current.style.transform = `translateY(${currTr - 48}px)`;
            }
          }
        }
      }
    } else if (e.key.length === 1) {
      const targetChar = words[currentWordIndex][currentInput.length];
      setTotalKeystrokes(prev => prev + 1);
      if (e.key === targetChar) {
        setCorrectKeystrokes(prev => prev + 1);
      }
      setCurrentInput(prev => prev + e.key);
    }
  };

  const calculateAcc = () => {
    if (totalKeystrokes === 0) return 0;
    return Math.round((correctKeystrokes / totalKeystrokes) * 100);
  };

  const getWpmStats = () => {
    const timeInMins = timeLimit / 60;
    let accurateChars = 0;
    let totalTypedChars = 0;

    const fullHistory = [...typedHistory];
    fullHistory[currentWordIndex] = currentInput;

    fullHistory.forEach((typed, i) => {
      if (!typed || !words[i]) return;
      const target = words[i];
      totalTypedChars += typed.length;
      if (i < currentWordIndex) totalTypedChars++;
      for (let j = 0; j < typed.length; j++) {
        if (typed[j] === target[j]) accurateChars++;
      }
      if (typed === target && i < currentWordIndex) {
        accurateChars++;
      }
    });

    return {
      wpm: Math.round((accurateChars / 5) / timeInMins),
      raw: Math.round((totalTypedChars / 5) / timeInMins),
    };
  };

  return (
    <div className="container">
      <header>
        <div className="logo" onClick={initTest}>
          <img src="/logo.png" alt="Dhameliya Typing Hub" className="logo-img" />
        </div>
        <nav>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <i className="fa-solid fa-gear"></i>
          </button>
          <button className="icon-btn" title="Profile">
            <i className="fa-solid fa-user"></i>
          </button>
        </nav>
      </header>

      <main>
        {!isFinished ? (
          <>
            <div className={`test-config ${isActive ? 'invisible' : ''}`}>
              <div className="modes">
                <button className={`mode-btn ${includePunctuation ? 'active' : ''}`} onClick={() => setIncludePunctuation(!includePunctuation)}>
                  <i className="fa-solid fa-at"></i> punctuation
                </button>
                <button className={`mode-btn ${includeNumbers ? 'active' : ''}`} onClick={() => setIncludeNumbers(!includeNumbers)}>
                  <i className="fa-solid fa-hashtag"></i> numbers
                </button>
              </div>
              <div className="divider"></div>
              <div className="modes">
                <button className="mode-btn active">time</button>
                <button className="mode-btn">words</button>
              </div>
              <div className="divider"></div>
              <div className="modes time-options">
                {[15, 30, 60, 120].map(t => (
                  <button key={t} className={`mode-btn time-btn ${timeLimit === t ? 'active' : ''}`} onClick={() => setTimeLimit(t)}>
                    {t}
                  </button>
                ))}
                <button
                  className={`mode-btn time-btn ${![15, 30, 60, 120].includes(timeLimit) ? 'active' : ''}`}
                  onClick={handleCustomTime}
                >
                  <i className="fa-solid fa-wrench"></i> {![15, 30, 60, 120].includes(timeLimit) ? formatTime(timeLimit) : ""}
                </button>
              </div>
            </div>

            <div className="typing-area" onClick={() => inputRef.current?.focus()}>
              <div className={`timer ${isActive ? 'visible' : ''}`}>{formatTime(timeRemaining)}</div>

              <div className="typing-container">
                <div className="words" ref={wordsContainerRef}>
                  {words.map((word, wIdx) => {
                    const isCurrentWord = wIdx === currentWordIndex;
                    const typedStr = isCurrentWord ? currentInput : typedHistory[wIdx];

                    let className = 'word ';
                    if (wIdx < currentWordIndex && typedStr !== word) {
                      className += 'error ';
                    }

                    return (
                      <div key={wIdx} className={className}>
                        {word.split('').map((char, cIdx) => {
                          let charClass = 'letter ';
                          if (typedStr && cIdx < typedStr.length) {
                            charClass += typedStr[cIdx] === char ? 'correct ' : 'incorrect ';
                          }
                          return <span key={cIdx} className={charClass}>{char}</span>;
                        })}
                        {typedStr && typedStr.length > word.length &&
                          typedStr.slice(word.length).split('').map((char, eIdx) => (
                            <span key={'extra' + eIdx} className="letter incorrect extra">{char}</span>
                          ))
                        }
                        {isCurrentWord && (
                          <div
                            className="caret"
                            style={{
                              left: `${calcCaretLeft(typedStr, word)}px`
                            }}
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                id="hidden-input"
                ref={inputRef}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                autoFocus
                onBlur={(e) => {
                  if (!isFinished) e.target.focus();
                }}
              />

              <div className="restart-wrapper">
                <button className="restart-btn" onClick={initTest}>
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="results active">
            <div className="stats-group primary">
              <div className="stat-box">
                <div className="stat-title">wpm</div>
                <div className="stat-value">{getWpmStats().wpm}</div>
              </div>
              <div className="stat-box">
                <div className="stat-title">acc</div>
                <div className="stat-value">{calculateAcc()}%</div>
              </div>
            </div>
            <div className="stats-group secondary">
              <div className="stat-box">
                <div className="stat-title">test type</div>
                <div className="stat-value-sm">time {timeLimit}s</div>
              </div>
              <div className="stat-box">
                <div className="stat-title">keys</div>
                <div className="stat-value-sm">{correctKeystrokes}/{totalKeystrokes - correctKeystrokes}</div>
              </div>
              <div className="stat-box">
                <div className="stat-title">time</div>
                <div className="stat-value-sm">{formatTime(timeLimit)}</div>
              </div>
            </div>
            <div className="restart-wrapper" style={{ marginTop: '2rem' }}>
              <button className="restart-btn" onClick={initTest}>
                <i className="fa-solid fa-angle-right"></i>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer>
        <div className="footer-left">
          <button className="footer-btn"><i className="fa-solid fa-envelope"></i> contact</button>
          <button className="footer-btn"><i className="fa-solid fa-code"></i> github</button>
        </div>
        <div className="footer-right">
          <div className="theme-display cursor-pointer" onClick={() => setShowSettings(true)}>
            <i className="fa-solid fa-palette"></i> {THEMES.find(t => t.id === theme)?.name.toLowerCase()}
          </div>
        </div>
      </footer>

      {showSettings && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fa-solid fa-gear"></i> Settings</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="settings-section">
              <h3>Personal Best <i className="fa-solid fa-trophy" style={{ color: 'var(--main-color)' }}></i></h3>
              <div className="score-box">
                <div className="score-value">{highestWpm}</div>
                <div className="score-label">highest wpm</div>
              </div>
            </div>
            <div className="settings-section">
              <h3>Theme</h3>
              <div className="theme-options">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <span>{t.name}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--main-color)' }}></div>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-color)', border: '1px solid currentColor' }}></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calcCaretLeft(typedStr, targetStr) {
  const len = typedStr.length;
  return len * 14.4;
}

function formatTime(seconds) {
  if (seconds < 60) return seconds.toString();
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default App;

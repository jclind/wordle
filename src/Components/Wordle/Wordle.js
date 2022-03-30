import React, { useState, useEffect } from 'react'
import WordleRow from '../WordleRow/WordleRow'
import KeyBoard from './KeyBoard/KeyBoard'
import './Wordle.scss'
import { threeLetterWords, answers } from '../../assets/data/threeLetterWords'
import { AiOutlineClose } from 'react-icons/ai'
import { scheduleJob } from 'node-schedule'
import Modal from 'react-modal'
Modal.setAppElement('#root')

const startDate = new Date(
  'Wed Mar 30 2022 00:00:00 GMT-0400 (Eastern Daylight Time)'
)
const diffDays = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1 - date2) / oneDay)) - 1
}

const Wordle = () => {
  const getAnswer = () => {
    const answersLength = answers.length
    const numDays = diffDays(startDate, new Date())
    console.log(answersLength)
    console.log(numDays)

    console.log(answers[numDays])
    return answers[numDays]
  }
  const [answer, setAnswer] = useState(getAnswer)
  useEffect(() => {
    setLocalStorage()
  }, [answer])

  useEffect(() => {
    scheduleJob('45 31 13 * * *', () => {
      setAnswer(getAnswer)
    })
  }, [])

  let localCurrGameData = JSON.parse(localStorage.getItem('current-game'))
  if (
    localCurrGameData &&
    localCurrGameData.expirationTime &&
    localCurrGameData.expirationTime < new Date().getTime()
  ) {
    localStorage.removeItem('current-game')
    localCurrGameData = null
  }

  const [gameStatus, setGameStatus] = useState(() => {
    if (localCurrGameData && localCurrGameData.gameStatus)
      return localCurrGameData.gameStatus
    return 'IN_PROGRESS'
  })
  const [gameOverModal, setGameOverModal] = useState(false)

  const [selectedRow, setSelectedRow] = useState(() => {
    if (localCurrGameData && localCurrGameData.selectedRow)
      return localCurrGameData.selectedRow
    return 0
  })
  const [pastWords, setPastWords] = useState(() => {
    if (localCurrGameData && localCurrGameData.pastWords)
      return localCurrGameData.pastWords
    return []
  })
  const [currWord, setCurrWord] = useState([])
  const [currWordValid, setCurrWordValid] = useState(true)
  const setLocalStorage = () => {
    console.log('saving data')
    let expiration = new Date()
    expiration = new Date(expiration.setUTCHours(23, 59, 59, 999)).getTime()

    const data = {
      gameStatus,
      selectedRow,
      pastWords,
      solution: answer,
      expirationTime: expiration,
    }
    localStorage.setItem('current-game', JSON.stringify(data))
  }

  useEffect(() => {
    setLocalStorage()
  }, [pastWords])

  // Modal functions
  useEffect(() => {
    if (gameStatus) {
      if (gameStatus === 'WON' || gameStatus === 'LOST') {
        return setGameOverModal(true)
      }
      setGameOverModal(false)
    }
  }, [gameStatus])
  function closeModal() {
    setGameOverModal(false)
  }

  const addLetterToCurrWord = key => {
    if (currWord.length >= 3 || gameStatus === 'WON' || gameStatus === 'LOST') {
      return
    }
    return setCurrWord(oldArray => [...oldArray, key.toUpperCase()])
  }
  const deleteLetter = () => {
    const newArr = currWord.slice(0, currWord.length - 1)
    setCurrWord([...newArr])
  }

  const enterWord = wordArr => {
    const letters = []

    wordArr.map((ltr, idx) => {
      if (answer.split('')[idx] === wordArr[idx]) {
        letters.push({ letter: ltr, position: 'eq' })
      } else if (answer.includes(ltr)) {
        let modWord = answer
        let splitCurrWord = currWord.join('').slice(0, idx)

        const numCurrLtrInWord = modWord.split(ltr).length - 1
        const numCurrLtrInCurrWord = splitCurrWord.split(ltr).length - 1

        let numCorrectInWord = 0
        wordArr.map((currLtr, idx) => {
          if (answer.split('')[idx] === wordArr[idx] && wordArr[idx] === ltr) {
            numCorrectInWord++
          }
        })

        if (
          numCurrLtrInWord >= numCurrLtrInCurrWord &&
          numCurrLtrInWord > numCorrectInWord
        ) {
          letters.push({ letter: ltr, position: 'in' })
        } else {
          letters.push({ letter: ltr, position: 'nin' })
        }
      } else {
        letters.push({ letter: ltr, position: 'nin' })
      }
    })

    // Check if word is correct
    const allLettersCorrect =
      letters.filter(ltr => ltr.position !== 'eq').length === 0
    if (allLettersCorrect) {
      setGameStatus('WON')
    } else if (selectedRow > 4) {
      setGameStatus('LOST')
    }
    return letters
  }
  const submitWord = () => {
    if (currWord.length !== 3) {
      return
    }
    if (currWordValid) {
      setSelectedRow(selectedRow + 1)
      setPastWords(prevWords => [
        ...prevWords,
        { word: currWord.length, words: enterWord(currWord) },
      ])
      setCurrWord([])
    } else {
      setCurrWord([])
    }
  }

  useEffect(() => {
    if (currWord.length === 3) {
      setCurrWordValid(
        threeLetterWords.indexOf(currWord.join('').toLowerCase()) !== -1
      )
    } else {
      setCurrWordValid(true)
    }
    const f = e => {
      if (gameStatus === 'IN_PROGRESS') {
        if (
          e.key.length === 1 &&
          e.key.match(/^[a-zA-Z]*$/) &&
          !e.altKey &&
          !e.ctrlKey
        ) {
          if (currWord.length >= 3) {
            return
          }
          addLetterToCurrWord(e.key)
        }
        if (e.key === 'Backspace') {
          deleteLetter()
        }

        if (e.key === 'Enter') {
          submitWord()
        }
      }
    }

    window.addEventListener('keydown', f)

    return () => window.removeEventListener('keydown', f)
  }, [currWord, currWordValid])

  const rows = []
  for (let i = 0; i <= 5; i++) {
    rows.push(
      <WordleRow
        key={i}
        isSelected={selectedRow === i}
        currWord={currWord}
        pastWord={pastWords[i]}
        currWordValid={currWordValid}
      />
    )
  }

  return (
    <div className='wordle-container'>
      <Modal
        isOpen={gameOverModal}
        onRequestClose={closeModal}
        contentLabel='Example Modal'
        className='game-over-modal modal'
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
          content: {
            background: (() => {
              if (document.querySelector('.app')) {
                const style = getComputedStyle(document.querySelector('.app'))
                return style.getPropertyValue('--primary-background')
              }
            })(),
            color: (() => {
              if (document.querySelector('.app')) {
                const style = getComputedStyle(document.querySelector('.app'))
                return style.getPropertyValue('--primary-text')
              }
            })(),
          },
        }}
      >
        {gameStatus === 'WON' ? (
          <>
            <h2>Puzzle Solved!</h2>
            <button className='close-modal-btn btn' onClick={closeModal}>
              <AiOutlineClose />
            </button>
            <div className='completed-text'>
              Congrats, you completed the wordle in {selectedRow} guess
              {selectedRow > 1 && 'es'}!
            </div>
          </>
        ) : (
          <>
            <h2>You'll get 'em next time!</h2>
            <button className='close-modal-btn btn' onClick={closeModal}>
              <AiOutlineClose />
            </button>
            <div className='completed-text'>
              The word was <span className='word'>{answer}</span>.
            </div>
          </>
        )}
      </Modal>
      <div className='wordle'>{rows}</div>
      <KeyBoard
        pastWords={pastWords}
        addLetter={addLetterToCurrWord}
        deleteLetter={deleteLetter}
        submitWord={submitWord}
      />
    </div>
  )
}

export default Wordle

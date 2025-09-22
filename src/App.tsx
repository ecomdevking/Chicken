import React, { useEffect, useState } from 'react'

import GameCanvas from './Components/GameCanvas'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from './store'
import { setBetAmount, setBetLevel, setBetSteps, setUser, updateBalance } from './store/gameSlice'



export default function App() {
    const [playing, setPlaying] = useState(false)
    const [currentEarnings, setCurrentEarnings] = useState(0)
    const [gameLost, setGameLost] = useState(false)
    const dispatch = useDispatch()
    const { userId, totalAmount, betAmount, betLevel, betSteps } = useSelector((s: RootState) => s.game)

    useEffect(() => {
        const API_BASE = (window as any).env?.VITE_API_KEY || 'http://localhost:4000'
        // Use existing id from storage if present; otherwise ask server to create one
        const storedId = localStorage.getItem('demo_user_id')
        fetch(`${API_BASE}/api/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedId || userId })
        })
            .then(r => r.json())
            .then(data => {
                console.log(data.userId)
                localStorage.setItem('demo_user_id', data.userId)
                dispatch(setUser({ userId: data.userId, totalAmount: data.totalAmount }))
            })
            .catch(() => {})

        const handleBeforeUnload = () => {
            const id = localStorage.getItem('demo_user_id') || userId
            if (id) {
                navigator.sendBeacon?.(`${API_BASE}/api/session/delete`, new Blob([JSON.stringify({ userId: id })], { type: 'application/json' }))
                localStorage.removeItem('demo_user_id')
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            const id = localStorage.getItem('demo_user_id') || userId
            if (id) fetch(`${API_BASE}/api/session/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) })
        }
    }, [])

    // Listen for start-game event from GameCanvas
    useEffect(() => {
        const handleStartGame = () => {
            setPlaying(true)
        }
        const handleStopGame = () => {
            setPlaying(false)
            setCurrentEarnings(0)
            setGameLost(false)
        }
        
        const handleGameLost = () => {
            setGameLost(true)
            setPlaying(false)
            setCurrentEarnings(0)
        }
        
        const handleRestartGame = () => {
            // Restart the game by stopping and starting again
            setPlaying(false)
            setTimeout(() => {
                setPlaying(true)
            }, 100) // Small delay to ensure clean restart
        }
        
        window.addEventListener('start-game', handleStartGame)
        window.addEventListener('stop-game', handleStopGame)
        window.addEventListener('game-lost', handleGameLost)
        window.addEventListener('restart-game', handleRestartGame)
        return () => {
            window.removeEventListener('start-game', handleStartGame)
            window.removeEventListener('stop-game', handleStopGame)
            window.removeEventListener('game-lost', handleGameLost)
            window.removeEventListener('restart-game', handleRestartGame)
        }
    }, [])

    // Handle cashout
    const handleCashout = () => {
        if ((window as any).cashoutGame) {
            (window as any).cashoutGame()
            setCurrentEarnings(0)
            setPlaying(false) // This will trigger a complete game reset
        }
    }
    
    // Handle start game
    const handleStartGame = () => {
        setGameLost(false)
        setPlaying(true)
    }

    // Update earnings display when playing
    useEffect(() => {
        if (playing) {
            const interval = setInterval(() => {
                if ((window as any).getCurrentEarnings) {
                    const earnings = (window as any).getCurrentEarnings()
                    setCurrentEarnings(earnings)
                }
            }, 100)
            return () => clearInterval(interval)
        } else {
            setCurrentEarnings(0)
        }
    }, [playing])

    return (
        <div className="app-root layout">
            <div className="canvas-area">
                <GameCanvas
                    playing={playing}
                    onWin={(amount) => {
                        // No balance update during game - only on cashout
                    }}
                    onLose={(loss) => {
                        // No balance update during game - only on cashout
                    }}
                    onCashout={(amount) => {
                        setCurrentEarnings(0)
                        // Balance update is handled in GameCanvas cashout function
                    }}
                />
            </div>
            <aside className="control-panel">
                <div className="balance">BALANCE: $ {totalAmount.toFixed(2)}</div>
                <div className="logo">CHICKEN<br />CRASH</div>
                <div className="controls">
                    <label>BET AMOUNT</label>
                    <div className="bet">$ {betAmount} 
                        <div className="bet-buttons"> 
                            <div 
                                className={playing ? 'disabled' : ''} 
                                onClick={() => !playing && dispatch(setBetAmount(Math.max(2, Math.floor(betAmount / 2))))}
                            >1/2</div> 
                            <div 
                                className={playing ? 'disabled' : ''} 
                                onClick={() => !playing && dispatch(setBetAmount(Math.min(200, betAmount * 2)))}
                            >x2</div>
                            <div 
                                className={playing ? 'disabled' : ''} 
                                onClick={() => !playing && dispatch(setBetAmount(200))}
                            >Max</div> 
                        </div>
                    </div>

                    <label>RISK</label>
                    <div className="risk">
                        <button 
                            className={`${betLevel==='low'? 'active': ''} ${playing ? 'disabled' : ''}`} 
                            onClick={() => !playing && dispatch(setBetLevel('low'))}
                            disabled={playing}
                        >LOW</button>
                        <button 
                            className={`${betLevel==='medium'? 'active': ''} ${playing ? 'disabled' : ''}`} 
                            onClick={() => !playing && dispatch(setBetLevel('medium'))}
                            disabled={playing}
                        >MEDIUM</button>
                        <button 
                            className={`${betLevel==='high'? 'active': ''} ${playing ? 'disabled' : ''}`} 
                            onClick={() => !playing && dispatch(setBetLevel('high'))}
                            disabled={playing}
                        >HIGH</button>
                    </div>
                    {playing && (
                        <button className="go-btn" onClick={() => window.dispatchEvent(new CustomEvent('chicken-go'))}>GO</button>
                    )}
                    <button className="play-btn" onClick={() => playing ? handleCashout() : handleStartGame()}>
                        {playing ? `CASHOUT $${currentEarnings.toFixed(2)}` : (gameLost ? 'START' : 'PLAY')}
                    </button>
                </div>
            </aside>
        </div>
    )
}

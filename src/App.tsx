import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sword, RefreshCw, Bookmark, Zap, Skull, Heart, DoorOpen, ArrowRight, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
type CardType = 'ATTACK' | 'BLOCK';

interface Card {
  id: string;
  name: string;
  type: CardType;
  value: number;
  cost?: number; // Ticks
  heal?: number; // HP
  description: string;
}

interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  rewardCount: number;
  isBoss?: boolean;
}

type Intent = { type: 'ATTACK' | 'BLOCK'; value: number; duration: number };

type GameView = 'COMBAT' | 'REWARD' | 'GAME_OVER' | 'VICTORY';

// --- Constants ---
const PLAYER_MAX_HP = 50; // Buffed HP

// Card Pool for Rewards - BUFFED STATS
const CARD_POOL: Omit<Card, 'id'>[] = [
  { name: 'Strike', type: 'ATTACK', value: 12, description: 'Deal 12 DMG' },
  { name: 'Defend', type: 'BLOCK', value: 10, description: 'Gain 10 Block' },
  { name: 'Bash', type: 'ATTACK', value: 20, cost: 3, description: 'Deal 20 DMG (3 Ticks)' },
  { name: 'Quick Shiv', type: 'ATTACK', value: 8, cost: 1, description: 'Deal 8 DMG (1 Tick)' },
  { name: 'Pyroblast', type: 'ATTACK', value: 40, cost: 4, description: 'Deal 40 DMG (4 Ticks)' },
  { name: 'Leech', type: 'ATTACK', value: 10, heal: 8, description: 'Deal 10 DMG + Heal 8' },
  { name: 'Iron Wall', type: 'BLOCK', value: 20, description: 'Gain 20 Block' },
  { name: 'Fortress', type: 'BLOCK', value: 30, cost: 4, description: 'Gain 30 Block (4 Ticks)' },
  { name: 'Inferno', type: 'ATTACK', value: 60, cost: 5, description: 'Deal 60 DMG (5 Ticks)' },
];

const CAMPAIGN: EnemyDef[] = [
  { id: 'scavenger', name: 'Scavenger', hp: 50, rewardCount: 5 }, 
  { id: 'sentinel', name: 'Sentinel', hp: 80, rewardCount: 6 }, 
  { id: 'boss', name: 'Cinder Lord', hp: 200, rewardCount: 0, isBoss: true },
];

const INITIAL_DECK: Card[] = [
  // { id: '1', name: 'Strike', type: 'ATTACK', value: 12, description: 'Deal 12 DMG' },
  // { id: '2', name: 'Strike', type: 'ATTACK', value: 12, description: 'Deal 12 DMG' },
  // { id: '3', name: 'Strike', type: 'ATTACK', value: 12, description: 'Deal 12 DMG' },
  // { id: '4', name: 'Strike', type: 'ATTACK', value: 12, description: 'Deal 12 DMG' },
  // { id: '5', name: 'Defend', type: 'BLOCK', value: 10, description: 'Gain 10 Block' },
  // { id: '6', name: 'Defend', type: 'BLOCK', value: 10, description: 'Gain 10 Block' },
  // { id: '7', name: 'Quick Shiv', type: 'ATTACK', value: 8, cost: 1, description: 'Deal 8 DMG (1 Tick)' },
  // { id: '8', name: 'Quick Shiv', type: 'ATTACK', value: 8, cost: 1, description: 'Deal 8 DMG (1 Tick)' },
  // { id: '9', name: 'Bash', type: 'ATTACK', value: 20, cost: 3, description: 'Deal 20 DMG (3 Ticks)' },
  // { id: '10', name: 'Leech', type: 'ATTACK', value: 10, heal: 8, description: 'Deal 10 DMG + Heal 8' },
  // { id: '11', name: 'Pyroblast', type: 'ATTACK', value: 40, cost: 4, description: 'Deal 40 DMG (4 Ticks)' },
  // { id: '12', name: 'Iron Wall', type: 'BLOCK', value: 20, description: 'Gain 20 Block' },
  { id: '1', name: 'Prepared Strike', type: 'ATTACK', value: 10, description: 'Deal 10 DMG. +10 DMG each time you shuffle with this card in hand.'},
  { id: '2', name: 'Prepared Strike', type: 'ATTACK', value: 10, description: 'Deal 10 DMG. +10 DMG each time you shuffle with this card in hand.'},
  { id: '3', name: 'Defend', type: 'BLOCK', value: 12, description: 'Gain 12 Block' },
  { id: '4', name: 'Defend', type: 'BLOCK', value: 12, description: 'Gain 12 Block' },
];

// --- Utilities ---
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateRewards(count: number): Card[] {
  return Array.from({ length: count }).map(() => {
    const template = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    return { ...template, id: generateId() };
  });
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const CardComponent = ({ 
  card, 
  isActive = false, 
  isNext = false, 
  isHold = false,
  isSelected = false,
  onClick
}: { 
  card: Card; 
  isActive?: boolean; 
  isNext?: boolean;
  isHold?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) => {
  const borderColor = card.type === 'ATTACK' ? 'border-red-500' : 'border-blue-500';
  const textColor = card.type === 'ATTACK' ? 'text-red-400' : 'text-blue-400';
  const Icon = card.type === 'ATTACK' ? Sword : Shield;
  const cost = card.cost || 2;

  // Visual state for selection
  const selectedStyle = isSelected ? "ring-4 ring-green-500 bg-neutral-800 scale-105" : "";

  return (
    <motion.div
      layoutId={isActive ? card.id : undefined}
      initial={false}
      animate={{ 
        scale: isActive ? 1 : isNext ? 0.8 : 0.9, 
        opacity: isNext ? 0.6 : 1,
        y: isNext ? 20 : 0,
        rotate: isHold ? -5 : 0,
      }}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between p-4 rounded-xl border-2 bg-neutral-900 shadow-xl backdrop-blur-sm transition-all duration-200",
        borderColor,
        selectedStyle,
        isActive ? "w-64 h-80 z-20" : isHold ? "w-40 h-56" : onClick ? "w-40 h-56 cursor-pointer" : "w-48 h-64 z-10 absolute top-0"
      )}
    >
      {isSelected && (
        <div className="absolute -top-3 -right-3 bg-green-500 text-black rounded-full p-1 z-50">
          <CheckCircle size={20} />
        </div>
      )}

      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg tracking-wider uppercase truncate">{card.name}</h3>
        <div className="flex items-center gap-1">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 text-xs font-mono text-orange-500 border border-orange-900" title="Tick Cost">
                {cost}
            </div>
            <div className={cn("p-1 rounded-full border", borderColor)}>
              <Icon size={16} className={textColor} />
            </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center gap-2 my-4">
        <span className={cn("text-5xl font-black", textColor)}>{card.value}</span>
        <span className="text-xs text-neutral-400 tracking-widest uppercase">{card.type}</span>
      </div>

      <p className="text-sm text-center text-neutral-300 font-medium border-t border-neutral-800 pt-3">
        {card.description}
      </p>
    </motion.div>
  );
};

export default function App() {
  // Global State
  const [deck, setDeck] = useState<Card[]>(() => shuffleArray(INITIAL_DECK));
  const [playerHP, setPlayerHP] = useState(PLAYER_MAX_HP);
  const [fightIndex, setFightIndex] = useState(0);
  const [view, setView] = useState<GameView>('COMBAT');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Reward State
  const [rewards, setRewards] = useState<Card[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);

  // Combat State
  const [holdCard, setHoldCard] = useState<Card | null>(null);
  const [playerBlock, setPlayerBlock] = useState(0);
  const [enemyHP, setEnemyHP] = useState(50);
  const [enemyBlock, setEnemyBlock] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [maxTicks, setMaxTicks] = useState(15);
  const [log, setLog] = useState<string[]>(["System Online."]);
  const [intent, setIntent] = useState<Intent>({ type: 'ATTACK', value: 8, duration: 15 });

  const activeCard = deck[0];
  const nextCard = deck[1];
  const currentEnemy = CAMPAIGN[fightIndex] || CAMPAIGN[0];

  const escapeCost = Math.floor(intent.value * 0.8);

  // Times shuffled this combat (for Prepared Strike buff)
  const [shuffleCount, setShuffleCount] = useState(0);

  // --- Core Game Logic ---

  const addToLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 5));
  };

  // AI Logic with Variable Duration
  const getNextIntent = useCallback((): Intent => {
    const isAggressive = Math.random() > 0.4;
    const baseVal = 8 + (fightIndex * 2);
    
    if (isAggressive) {
        // Attack
        const isHeavy = Math.random() > 0.7;
        if (isHeavy) {
            return { type: 'ATTACK', value: baseVal + 5 + Math.floor(Math.random() * 5), duration: 20 }; // Slow, Heavy
        } else {
            return { type: 'ATTACK', value: baseVal + Math.floor(Math.random() * 3), duration: 12 }; // Fast, Light
        }
    } else {
        // Block
        return { type: 'BLOCK', value: baseVal - 2 + Math.floor(Math.random() * 4), duration: 10 }; // Fast Block
    }
  }, [fightIndex]);

  // Init Fight
  useEffect(() => {
    if (view === 'COMBAT') {
      console.log("Initializing fight", fightIndex);
      setEnemyHP(currentEnemy.hp);
      setEnemyBlock(0);
      setPlayerBlock(0);
      setTicks(0);
      setHoldCard(null);
      setShuffleCount(0);

      for( let i = 0; i < deck.length; i++ )
      {
          if( deck[i].name === 'Prepared Strike' )
          {
              deck[i] = { ...deck[i], value: 10 };
          }
      }
      
      const initialIntent = { type: 'ATTACK', value: 8 + fightIndex * 2, duration: 15 } as Intent;
      setIntent(initialIntent);
      setMaxTicks(initialIntent.duration);
      
      addToLog(`ENCOUNTER: ${currentEnemy.name} detected.`);
      setIsTransitioning(false); 
    }
  }, [fightIndex, view, currentEnemy]); 

  const executeEnemyTurn = () => {
    let logMsg = "";
    
    if (intent.type === 'ATTACK') {
        const damage = Math.max(0, intent.value - playerBlock);
        setPlayerHP(prev => prev - damage);
        logMsg = `BREACH: ${currentEnemy.name} attacked for ${intent.value} (${damage} taken).`;
        if (playerHP - damage <= 0) {
            setView('GAME_OVER');
        }
    } else {
        setEnemyBlock(prev => prev + intent.value);
        logMsg = `BREACH: ${currentEnemy.name} fortified (+${intent.value} Block).`;
    }

    addToLog(logMsg);
    setPlayerBlock(0);
    setTicks(0);
    
    const next = getNextIntent();
    setIntent(next);
    setMaxTicks(next.duration);
  };

  // Combat Check
  useEffect(() => {
    if (view !== 'COMBAT' || isTransitioning) return;
    
    if (enemyHP <= 0) {
        setView(fightIndex >= CAMPAIGN.length - 1 ? 'VICTORY' : 'REWARD');
        if (fightIndex < CAMPAIGN.length - 1) {
            setRewards(generateRewards(currentEnemy.rewardCount));
            setSelectedRewards([]);
        }
    } else if (playerHP <= 0) {
        setView('GAME_OVER');
    } else if (deck.length === 0 && !holdCard) {
        setView('GAME_OVER');
        addToLog("CRITICAL: Out of ammunition.");
    }
  }, [enemyHP, playerHP, deck.length, holdCard, view, fightIndex, isTransitioning, currentEnemy]);


  const handlePlay = () => {
    if (!activeCard || view !== 'COMBAT') return;
    const cost = activeCard.cost || 2;
    
    let currentTicks = ticks;

    // 1. Advance Time & Check Breach
    currentTicks += cost;
    if (currentTicks >= maxTicks) {
        executeEnemyTurn();
        currentTicks = 0; 
    } else {
        setTicks(currentTicks);
    }

    // 2. Player Action (If alive)
    if (playerHP > 0) {
        if (activeCard.type === 'ATTACK') {
            let dmg = activeCard.value;
            if(activeCard.name === 'Prepared Strike') {
                dmg += shuffleCount * 5;
            }
            // Fix: Calculate using closure state to avoid side-effects in setState updater (Strict Mode double-invoke fix)
            const remainingBlock = enemyBlock - dmg;
            
            if (remainingBlock < 0) {
                setEnemyHP(h => Math.max(0, h + remainingBlock)); // remainingBlock is negative damage
                setEnemyBlock(0);
            } else {
                setEnemyBlock(remainingBlock);
            }
            addToLog(`PLAY: ${activeCard.name} (${dmg} DMG).`);
        } else {
            setPlayerBlock(prev => prev + activeCard.value);
            addToLog(`PLAY: ${activeCard.name} (+${activeCard.value} Block).`);
        }

        if (activeCard.heal) {
            setPlayerHP(prev => Math.min(PLAYER_MAX_HP, prev + activeCard.heal!));
        }
    }

    // 3. Burn Card
    setDeck(prev => prev.slice(1));
  };

  const handleShuffle = () => {
    if (!activeCard) return;
    const cost = 5;
    let currentTicks = ticks + cost;
    
    if (currentTicks >= maxTicks) {
        executeEnemyTurn();
        currentTicks = 0;
    } else {
        setTicks(currentTicks);
    }
  
    const newDeck = [...deck];
    const card = newDeck.shift();
    if (card) newDeck.push(card);
    setDeck(newDeck);
    addToLog("SHUFFLE: Deck cycled.");

    // Increment shuffle count for Prepared Strike buff
    if( activeCard.name === 'Prepared Strike' )
    {
        setShuffleCount(prev => prev + 1);
        for( let i = 0; i < newDeck.length; i++ )
        {
            if( newDeck[i].name === 'Prepared Strike' )
            {
                newDeck[i] = { ...newDeck[i], value: newDeck[i].value + 10 };
            }
        }
    }
  };

  const handleHold = () => {
    if (!activeCard && !holdCard) return;
    const cost = 1;
    let currentTicks = ticks + cost;

    if (currentTicks >= maxTicks) {
        executeEnemyTurn();
        currentTicks = 0;
    } else {
        setTicks(currentTicks);
    }

    if (!activeCard && holdCard) {
        setDeck([holdCard]);
        setHoldCard(null);
    } else if (holdCard) {
      const newDeck = [...deck];
      const currentActive = newDeck.shift()!;
      newDeck.unshift(holdCard);
      setDeck(newDeck);
      setHoldCard(currentActive);
    } else {
      const newDeck = [...deck];
      const card = newDeck.shift()!;
      setDeck(newDeck);
      setHoldCard(card);
    }
  };

  const handleEscape = () => {
      const penalty = escapeCost;
      setPlayerHP(prev => prev - penalty);
      addToLog(`ESCAPE: Took ${penalty} damage.`);
      
      if (playerHP - penalty > 0) {
          setIsTransitioning(true); // START TRANSITION
          setFightIndex(i => i + 1);
          setView('COMBAT');
      } else {
          setView('GAME_OVER');
      }
  };

  const confirmRewards = () => {
      const newCards = rewards.filter(r => selectedRewards.includes(r.id));
      setDeck(prev => [...prev, ...newCards]);
      
      setIsTransitioning(true); // START TRANSITION
      setFightIndex(i => i + 1);
      setView('COMBAT');
  };

  // --- Views ---

  if (view === 'GAME_OVER') {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-6xl font-black text-red-600 mb-4 tracking-tighter">CRITICAL FAILURE</h1>
            <p className="text-neutral-400 mb-8 font-mono">AMMUNITION DEPLETED OR VITAL SIGNS ZERO.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-white text-black font-bold hover:bg-neutral-200"
            >
                REBOOT SYSTEM
            </button>
        </div>
      );
  }

  if (view === 'VICTORY') {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-6xl font-black text-blue-500 mb-4 tracking-tighter">MISSION COMPLETE</h1>
            <p className="text-neutral-400 mb-8 font-mono">ALL TARGETS ELIMINATED.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-white text-black font-bold hover:bg-neutral-200"
            >
                NEW RUN
            </button>
        </div>
      );
  }

  if (view === 'REWARD') {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-mono">
            <h2 className="text-3xl text-orange-500 font-bold mb-2">TARGET DESTROYED</h2>
            <p className="text-neutral-400 mb-8">SALVAGE OPERATIONS ACTIVE. SELECT RESOURCES TO KEEP.</p>
            
            <div className="flex gap-4 mb-8 overflow-x-auto p-4 w-full justify-center">
                {rewards.map(card => (
                    <CardComponent 
                        key={card.id} 
                        card={card} 
                        onClick={() => {
                            setSelectedRewards(prev => 
                                prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
                            )
                        }}
                        isSelected={selectedRewards.includes(card.id)}
                    />
                ))}
            </div>

            <div className="flex gap-4 items-center">
                <span className="text-sm text-neutral-500 uppercase tracking-widest">{selectedRewards.length} Cards Selected</span>
                <button 
                    onClick={confirmRewards}
                    className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold hover:bg-neutral-200 transition-colors"
                >
                    CONFIRM & PROCEED <ArrowRight size={20} />
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 overflow-hidden flex flex-col font-mono selection:bg-orange-500 selection:text-black">
      
      {/* HEADER */}
      <header className="flex flex-col gap-4 max-w-4xl mx-auto w-full mb-8">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-neutral-900 rounded border border-neutral-700 relative group">
               <Skull className={currentEnemy.isBoss ? "text-purple-500" : "text-red-500"} size={24} />
               <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-neutral-900 px-2 py-1 rounded border border-neutral-700 z-50">
                 {intent.type} {intent.value} ({intent.duration}t)
               </div>
             </div>
             <div>
               <h2 className={cn("text-xl font-bold tracking-widest", currentEnemy.isBoss ? "text-purple-500" : "text-red-500")}>
                 {currentEnemy.name}
               </h2>
               <div className="flex items-center gap-2">
                 <div className="w-48 h-4 bg-neutral-800 rounded-full overflow-hidden relative">
                   <motion.div 
                     className={cn("h-full", currentEnemy.isBoss ? "bg-purple-600" : "bg-red-600")}
                     animate={{ width: `${Math.max(0, (enemyHP / currentEnemy.hp) * 100)}%` }}
                   />
                   {/* Enemy Block Indicator */}
                   {enemyBlock > 0 && (
                       <div className="absolute top-0 right-0 h-full bg-blue-500/50 border-l border-white" style={{ width: '20%' }} /> 
                   )}
                 </div>
                 <div className="flex flex-col text-xs">
                    <span className="text-xl font-mono">{enemyHP}</span>
                    {enemyBlock > 0 && <span className="text-blue-400">+{enemyBlock} SHLD</span>}
                 </div>
               </div>
             </div>
          </div>
          
          <div className="text-right">
             <h1 className="text-4xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">CINDER</h1>
             <p className="text-xs text-neutral-500 tracking-[0.3em]">PROTO_BUILD_v1.0</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pt-6">
           <div className="flex justify-between text-xs text-neutral-400 mb-1 uppercase tracking-widest">
             <span>Timeline</span>
             <span className="text-orange-500 font-bold animate-pulse">Breach ({ticks}/{maxTicks})</span>
           </div>
             <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
               {[...Array(Math.min(20, maxTicks))].map((_, i) => (
                 <div key={i} className="absolute h-full w-[1px] bg-neutral-800" style={{ left: `${(i / maxTicks) * 100}%` }} />
               ))}
               <div 
                 className="h-full bg-gradient-to-r from-orange-900 to-orange-500 transition-all duration-300 ease-out"
                 style={{ width: `${Math.min(100, (ticks / maxTicks) * 100)}%` }}
               />
             </div>
             <div 
               className="absolute top-4 -ml-1.5 transition-all duration-300 ease-out"
               style={{ left: `${Math.min(100, (ticks / maxTicks) * 100)}%` }}
             >
               <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-orange-500" />
             </div>
        </div>
      </header>

      {/* STAGE */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full max-w-4xl mx-auto">
        <div className="flex w-full items-center justify-center gap-12 h-96">
          {/* Hold */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-neutral-500 tracking-widest uppercase">Hold Slot</span>
            <div className="w-44 h-60 border-2 border-dashed border-neutral-800 rounded-xl flex items-center justify-center bg-neutral-900/50">
              <AnimatePresence mode='popLayout'>
                {holdCard ? <CardComponent key={holdCard.id} card={holdCard} isHold /> : <Bookmark className="text-neutral-700" size={32} />}
              </AnimatePresence>
            </div>
          </div>

          {/* Active */}
          <div className="relative w-64 h-80 flex items-center justify-center">
            <AnimatePresence mode='popLayout'>
               {nextCard && <div className="absolute top-0 z-0 opacity-50 scale-90 translate-y-4"><CardComponent key={nextCard.id} card={nextCard} isNext /></div>}
               {activeCard ? <CardComponent key={activeCard.id} card={activeCard} isActive /> : <div className="text-neutral-600">DECK EMPTY</div>}
            </AnimatePresence>
          </div>

          {/* Log */}
          <div className="w-64 h-60 border border-neutral-800 bg-neutral-900/50 rounded p-4 flex flex-col">
            <h4 className="text-xs text-neutral-500 uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">System Log</h4>
            <div className="flex-1 overflow-hidden flex flex-col gap-1 text-xs font-mono text-neutral-400">
              {log.map((entry, i) => (
                <div key={i}><span className="text-orange-900 mr-2">{'>'}</span>{entry}</div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-8 max-w-4xl mx-auto w-full grid grid-cols-3 gap-8 items-end pb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
             <Heart className="text-white" size={32} fill={playerHP < 10 ? "red" : "black"} />
             <span className="absolute -top-2 -right-2 bg-neutral-800 text-xs px-1 rounded">{PLAYER_MAX_HP}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{playerHP} HP</span>
            {playerBlock > 0 && <span className="text-blue-400 text-sm flex items-center gap-1"><Shield size={12} /> {playerBlock} Shield</span>}
          </div>
        </div>

        <div className="flex justify-center gap-4">
           <button onClick={handleShuffle} disabled={!activeCard} className="group flex flex-col items-center gap-1 disabled:opacity-50 cursor-pointer">
             <div className="p-4 rounded-full border border-neutral-700 bg-neutral-900 group-hover:bg-neutral-800 group-hover:border-orange-500 transition-all"><RefreshCw size={20} /></div>
             <span className="text-[10px] uppercase tracking-wider text-neutral-500">Shuffle (+5)</span>
           </button>

           <button onClick={handlePlay} disabled={!activeCard} className="group flex flex-col items-center gap-2 -mt-6 disabled:opacity-50 cursor-pointer">
             <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-all"><Zap size={32} fill="black" /></div>
             <span className="text-xs font-bold uppercase tracking-widest text-white group-hover:text-orange-500">Play (+{activeCard?.cost || 2})</span>
           </button>

           <button onClick={handleHold} disabled={!activeCard && !holdCard} className="group flex flex-col items-center gap-1 disabled:opacity-50 cursor-pointer">
             <div className="p-4 rounded-full border border-neutral-700 bg-neutral-900 group-hover:bg-neutral-800 group-hover:border-blue-500 transition-all"><Bookmark size={20} /></div>
             <span className="text-[10px] uppercase tracking-wider text-neutral-500">Hold (+1)</span>
           </button>
        </div>

        <div className="flex flex-col items-end gap-2 text-neutral-500">
           <div className="flex items-center gap-2">
             <span className="text-sm uppercase tracking-widest">Deck Count</span>
             <span className="text-2xl font-bold text-white">{deck.length}</span>
           </div>
           
           {!currentEnemy.isBoss && (
             <div className="group relative">
               <button onClick={handleEscape} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 uppercase tracking-widest border border-red-900 px-4 py-2 rounded hover:bg-red-900/20 transition-colors">
                 <DoorOpen size={16} /> Escape (-{escapeCost} HP)
               </button>
             </div>
           )}
        </div>
      </footer>
    </div>
  )
}

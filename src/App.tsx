import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sword, RefreshCw, Skull, Heart, ArrowRight, Zap, List } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
type CardType = 'ATTACK' | 'BLOCK';
type Aspect = 'STRIFE' | 'FLUX' | 'FORTUNE' | 'VIGIL' | 'TENET' | 'OMEN' | 'SURGE';
type Polarity = 'WARM' | 'COOL';

interface Card {
  id: string;
  name: string;
  type: CardType;
  aspect: Aspect;
  value: number;
  cost?: number; // Ticks
  heal?: number; // HP
  description: string;
  faceUp?: boolean;
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
const PLAYER_MAX_HP = 50; 

// Nerfed values, and strictly derived polarity in getPolarity
const CARD_POOL: Omit<Card, 'id' | 'faceUp'>[] = [
  { name: 'Strike', type: 'ATTACK', aspect: 'STRIFE', value: 6, description: 'Deal 6 DMG' },
  { name: 'Defend', type: 'BLOCK', aspect: 'VIGIL', value: 5, description: 'Gain 5 Block' },
  { name: 'Bash', type: 'ATTACK', aspect: 'STRIFE', value: 12, cost: 3, description: 'Deal 12 DMG (3 Ticks)' },
  { name: 'Quick Shiv', type: 'ATTACK', aspect: 'SURGE', value: 4, cost: 1, description: 'Deal 4 DMG (1 Tick)' },
  { name: 'Pyroblast', type: 'ATTACK', aspect: 'FLUX', value: 20, cost: 4, description: 'Deal 20 DMG (4 Ticks)' },
  { name: 'Leech', type: 'ATTACK', aspect: 'FORTUNE', value: 5, heal: 4, description: 'Deal 5 DMG + Heal 4' },
  { name: 'Iron Wall', type: 'BLOCK', aspect: 'TENET', value: 12, description: 'Gain 12 Block' },
  { name: 'Fortress', type: 'BLOCK', aspect: 'TENET', value: 20, cost: 4, description: 'Gain 20 Block (4 Ticks)' },
  { name: 'Inferno', type: 'ATTACK', aspect: 'OMEN', value: 30, cost: 5, description: 'Deal 30 DMG (5 Ticks)' },
];

const CAMPAIGN: EnemyDef[] = [
  { id: 'scavenger', name: 'Scavenger', hp: 50, rewardCount: 5 }, 
  { id: 'sentinel', name: 'Sentinel', hp: 80, rewardCount: 6 }, 
  { id: 'boss', name: 'Cinder Lord', hp: 200, rewardCount: 0, isBoss: true },
];

// Increased starting deck size
const INITIAL_DECK_TEMPLATES = [
    ...Array(8).fill(CARD_POOL[0]), // 8 Strikes
    ...Array(8).fill(CARD_POOL[1]), // 8 Defends
    CARD_POOL[2], // Bash
    CARD_POOL[3], // Quick Shiv
    CARD_POOL[3], // Quick Shiv
    CARD_POOL[6], // Iron Wall
    CARD_POOL[6], // Iron Wall
];

// --- Utilities ---
function getPolarity(card: Card): Polarity {
    // Strictly derived from Type as requested
    return card.type === 'ATTACK' ? 'WARM' : 'COOL';
}

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

function createDeck(): Card[] {
    return INITIAL_DECK_TEMPLATES.map(t => ({ ...t, id: generateId(), faceUp: false }));
}

function generateRewards(count: number): Card[] {
  return Array.from({ length: count }).map(() => {
    const template = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    return { ...template, id: generateId(), faceUp: true };
  });
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const CardPreview = ({ card, isVisible }: { card: Card; isVisible: boolean }) => {
  if (!isVisible || !card.faceUp) return null;

  const polarity = getPolarity(card);
  const isWarm = polarity === 'WARM';
  
  const borderColor = isWarm ? 'border-red-500' : 'border-blue-500';
  const bgColor = isWarm ? 'bg-red-950/90' : 'bg-blue-950/90';
  const textColor = isWarm ? 'text-red-400' : 'text-blue-400';
  const Icon = card.type === 'ATTACK' ? Sword : Shield;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "fixed z-60 p-4 rounded-xl border-2 shadow-2xl backdrop-blur-md",
        bgColor,
        borderColor,
        "w-64 h-80 flex flex-col justify-between pointer-events-none"
      )}
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        marginTop: '-100px' // Offset to show above cursor
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
            <h3 className="font-bold text-sm tracking-wider uppercase">{card.name}</h3>
            <span className={cn("text-xs font-mono opacity-80", textColor)}>{card.aspect}</span>
        </div>
        <div className="flex items-center gap-1">
             <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-xs font-mono text-orange-500 border border-orange-900" title="Tick Cost">
                {card.cost || 2}
             </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center gap-2 my-2">
        <Icon size={32} className={textColor} />
        <span className={cn("text-4xl font-black", textColor)}>{card.value}</span>
        <span className="text-xs text-neutral-400 uppercase tracking-widest">{card.type}</span>
      </div>

      <div className="text-xs text-center text-neutral-300 font-medium leading-tight border-t border-white/20 pt-3">
        {card.description}
      </div>
    </motion.div>
  );
};

const CardComponent = ({ 
  card, 
  onClick,
  isDraggable = false,
  isSelected = false,
  className,
  onHoverStart,
  onHoverEnd
}: { 
  card: Card; 
  onClick?: () => void;
  isDraggable?: boolean;
  isSelected?: boolean;
  className?: string;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) => {
  if (!card.faceUp) {
      return (
        <motion.div 
            layoutId={card.id}
            className={cn("w-28 h-40 rounded-lg bg-neutral-800 border border-neutral-700 shadow-md flex items-center justify-center", className)}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
        >
            <div className="w-16 h-28 border border-neutral-700/50 rounded flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-neutral-900 border border-neutral-800" />
            </div>
        </motion.div>
      )
  }

  const polarity = getPolarity(card);
  const isWarm = polarity === 'WARM';
  
  const borderColor = isWarm ? 'border-red-500/50' : 'border-blue-500/50';
  const bgColor = isWarm ? 'bg-red-950/30' : 'bg-blue-950/30';
  const textColor = isWarm ? 'text-red-400' : 'text-blue-400';
  const Icon = card.type === 'ATTACK' ? Sword : Shield;

  return (
    <motion.div
      layoutId={card.id}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05, zIndex: 50 } : undefined}
      whileDrag={{ scale: 1.1, zIndex: 100 }}
      animate={{ scale: isSelected ? 1.05 : 1 }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className={cn(
        "w-28 h-40 flex flex-col justify-between p-3 rounded-lg border-2 shadow-xl backdrop-blur-sm select-none transition-all",
        bgColor,
        isSelected ? "ring-2 ring-white border-transparent z-50 brightness-110" : borderColor,
        onClick ? "cursor-pointer" : "",
        isDraggable ? "cursor-grab active:cursor-grabbing" : "",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
            <h3 className="font-bold text-xs tracking-wider uppercase truncate max-w-[70px]" title={card.name}>{card.name}</h3>
            <span className={cn("text-[10px] font-mono opacity-70", textColor)}>{card.aspect}</span>
        </div>
        <div className="flex items-center gap-1">
             <div className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-900 text-[10px] font-mono text-orange-500 border border-orange-900" title="Tick Cost">
                {card.cost || 2}
             </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center gap-1 my-1 pointer-events-none">
        <Icon size={24} className={textColor} />
        <span className={cn("text-2xl font-black", textColor)}>{card.value}</span>
      </div>

      <div className="text-[10px] text-center text-neutral-300 font-medium leading-tight border-t border-white/10 pt-2 pointer-events-none">
        {card.description}
      </div>
    </motion.div>
  );
};

export default function App() {
  // Global State
  const [playerHP, setPlayerHP] = useState(PLAYER_MAX_HP);
  const [fightIndex, setFightIndex] = useState(0);
  const [view, setView] = useState<GameView>('COMBAT');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  
  // Solitaire State
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [tableau, setTableau] = useState<Card[][]>([[], [], []]);
  const [enemyFeedback, setEnemyFeedback] = useState<'ATTACK' | 'BLOCK' | null>(null);
  
  // Selection State (New)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ type: 'WASTE' | 'TABLEAU', pileIndex?: number } | null>(null);

  // Reward State
  const [rewards, setRewards] = useState<Card[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);

  // Combat State
  const [playerBlock, setPlayerBlock] = useState(0);
  const [enemyHP, setEnemyHP] = useState(50);
  const [enemyBlock, setEnemyBlock] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [maxTicks, setMaxTicks] = useState(15);
  const [log, setLog] = useState<string[]>(["System Online."]);
  const [intent, setIntent] = useState<Intent>({ type: 'ATTACK', value: 8, duration: 15 });

  const currentEnemy = CAMPAIGN[fightIndex] || CAMPAIGN[0];
  
  // --- Core Game Logic ---

  const addToLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 5));
  };

  const getNextIntent = useCallback((): Intent => {
    const isAggressive = Math.random() > 0.4;
    const baseVal = 8 + (fightIndex * 2);
    
    if (isAggressive) {
        const isHeavy = Math.random() > 0.7;
        if (isHeavy) return { type: 'ATTACK', value: baseVal + 5 + Math.floor(Math.random() * 5), duration: 20 };
        return { type: 'ATTACK', value: baseVal + Math.floor(Math.random() * 3), duration: 12 };
    } else {
        return { type: 'BLOCK', value: baseVal - 2 + Math.floor(Math.random() * 4), duration: 10 };
    }
  }, [fightIndex]);

  // Init Fight
  const initFight = useCallback((deck?: Card[]) => {
      console.log("Initializing fight", fightIndex);
      setEnemyHP(currentEnemy.hp);
      setEnemyBlock(0);
      setPlayerBlock(0);
      setTicks(0);
      setEnemyFeedback(null);
      setSelectedCardId(null);
      setSelectedLocation(null);
      setHoveredCard(null);
      
      const initialIntent = { type: 'ATTACK', value: 8 + fightIndex * 2, duration: 15 } as Intent;
      setIntent(initialIntent);
      setMaxTicks(initialIntent.duration);
      
      addToLog(`ENCOUNTER: ${currentEnemy.name} detected.`);
      setIsTransitioning(false); 

      // Deal Solitaire Layout
      const fullDeck = deck ? shuffleArray(deck) : shuffleArray(createDeck());
      const newTableau: Card[][] = [[], [], []];
      let cardIdx = 0;

      // Deal 3 cards to each of the 3 piles (2 face down, 1 face up)
      for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
              if (cardIdx < fullDeck.length) {
                  const card = fullDeck[cardIdx];
                  // Only top card is face up
                  card.faceUp = j === 2;
                  newTableau[i].push(card);
                  cardIdx++;
              }
          }
      }

      setTableau(newTableau);
      setWaste([]);
      setStock(fullDeck.slice(cardIdx)); // Remaining to Stock (face down by default)

  }, [fightIndex, currentEnemy]);

  useEffect(() => {
    if (view === 'COMBAT') {
        initFight(); // Initial game start
    }
  }, []); 

  const executeEnemyTurn = () => {
    let logMsg = "";
    
    // Trigger Feedback
    setEnemyFeedback(intent.type);
    setTimeout(() => setEnemyFeedback(null), 1000);

    if (intent.type === 'ATTACK') {
        const damage = Math.max(0, intent.value - playerBlock);
        setPlayerHP(prev => prev - damage);
        logMsg = `BREACH: ${currentEnemy.name} attacked for ${intent.value} (${damage} taken).`;
        if (playerHP - damage <= 0) setView('GAME_OVER');
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

  const advanceTime = (amount: number) => {
    let newTicks = ticks + amount;
    if (newTicks >= maxTicks) {
        executeEnemyTurn();
        newTicks = 0; 
    }
    setTicks(newTicks);
  };

  // Actions
  const drawStock = () => {
      // Clear selection when interacting with non-playable areas
      setSelectedCardId(null);
      setSelectedLocation(null);

      if (stock.length === 0) {
          // Recycle Waste to Stock
          if (waste.length === 0) return;
          const newStock = [...waste].reverse().map(c => ({...c, faceUp: false}));
          setStock(newStock);
          setWaste([]);
          addToLog("STOCK: Recycled waste pile.");
          advanceTime(2); // Cost for recycling?
          return;
      }

      const card = stock[0];
      const newStock = stock.slice(1);
      const newWaste = [...waste, { ...card, faceUp: true }];
      
      setStock(newStock);
      setWaste(newWaste);
      advanceTime(2);
  };

  const handleCardClick = (card: Card, location: 'WASTE' | 'TABLEAU', pileIndex?: number) => {
      if (!card.faceUp) return;
      
      if (selectedCardId === card.id) {
          // Deselect
          setSelectedCardId(null);
          setSelectedLocation(null);
      } else {
          // Select
          setSelectedCardId(card.id);
          setSelectedLocation({ type: location, pileIndex });
      }
  };

  const playSelectedCard = () => {
      if (!selectedCardId || !selectedLocation) return;
      
      let card: Card | undefined;
      
      if (selectedLocation.type === 'WASTE') {
          card = waste.find(c => c.id === selectedCardId);
      } else if (selectedLocation.type === 'TABLEAU' && typeof selectedLocation.pileIndex === 'number') {
          card = tableau[selectedLocation.pileIndex].find(c => c.id === selectedCardId);
      }

      if (!card) return;

      // Effect
      if (card.type === 'ATTACK') {
          const dmg = card.value;
          const remainingBlock = enemyBlock - dmg;
          if (remainingBlock < 0) {
              setEnemyHP(h => Math.max(0, h + remainingBlock));
              setEnemyBlock(0);
          } else {
              setEnemyBlock(remainingBlock);
          }
          addToLog(`PLAY: ${card.name} (${dmg} DMG).`);
      } else {
          setPlayerBlock(prev => prev + card.value);
          addToLog(`PLAY: ${card.name} (+${card.value} Block).`);
      }
      if (card.heal) setPlayerHP(prev => Math.min(PLAYER_MAX_HP, prev + card.heal!));

      // Remove Card
      if (selectedLocation.type === 'WASTE') {
          setWaste(prev => prev.slice(0, -1));
      } else if (selectedLocation.type === 'TABLEAU' && typeof selectedLocation.pileIndex === 'number') {
          setTableau(prev => {
              const newTableau = [...prev];
              const pile = [...newTableau[selectedLocation.pileIndex!]];
              pile.pop(); // Remove played card
              // Ensure new top is face up
              if (pile.length > 0) {
                  const newTop = pile[pile.length - 1];
                  pile[pile.length - 1] = { ...newTop, faceUp: true };
              }
              newTableau[selectedLocation.pileIndex!] = pile;
              return newTableau;
          });
      }

      // Reset Selection
      setSelectedCardId(null);
      setSelectedLocation(null);

      advanceTime(1); // Cost to Play
  };

  // Complex State Manipulator for Drag and Drop
  const handleDragEnd = (_: any, info: any, sourceCard: Card, source: 'WASTE' | 'TABLEAU', sourcePileIndex?: number) => {
      const dropX = info.point.x;
      const dropY = info.point.y;
      
      // Prevent selection confusion after drag
      setSelectedCardId(null);
      setSelectedLocation(null);

      // Simple coordinate check for 3 piles (This is a hacky way, refs would be better but requires more setup)
      // Assuming piles are in the bottom row.
      const elements = document.elementsFromPoint(dropX, dropY);
      const pileElement = elements.find(el => el.getAttribute('data-pile-index'));
      
      if (pileElement) {
          const targetIndex = parseInt(pileElement.getAttribute('data-pile-index')!);
          
          // Cannot drop on self
          if (source === 'TABLEAU' && sourcePileIndex === targetIndex) return;

          // Validate Move
          const targetPile = tableau[targetIndex];
          const targetCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;
          
          if (targetCard && getPolarity(sourceCard) === getPolarity(targetCard)) {
             // Invalid
             return;
          }

          // Execute Move
          // Remove from source
          if (source === 'WASTE') {
              setWaste(prev => prev.slice(0, -1));
          } else if (source === 'TABLEAU' && typeof sourcePileIndex === 'number') {
              setTableau(prev => {
                  const newTableau = [...prev];
                  const pile = [...newTableau[sourcePileIndex]];
                  pile.pop();
                  // Ensure new top is face up
                  if (pile.length > 0) {
                       const newTop = pile[pile.length - 1];
                       pile[pile.length - 1] = { ...newTop, faceUp: true };
                  }
                  newTableau[sourcePileIndex] = pile;
                  return newTableau;
              });
          }

          // Add to target
          setTableau(prev => {
              const newTableau = [...prev];
              newTableau[targetIndex] = [...newTableau[targetIndex], sourceCard];
              return newTableau;
          });
          
          advanceTime(0); // Free action
      }
  };

  // Check Game Over / Victory
  useEffect(() => {
    if (view !== 'COMBAT' || isTransitioning) return;
    
    // Check if player has no moves? (Not implementing for prototype)
    if (enemyHP <= 0) {
        setView(fightIndex >= CAMPAIGN.length - 1 ? 'VICTORY' : 'REWARD');
        if (fightIndex < CAMPAIGN.length - 1) {
            setRewards(generateRewards(currentEnemy.rewardCount));
            setSelectedRewards([]);
        }
    } else if (playerHP <= 0) {
        setView('GAME_OVER');
    }
  }, [enemyHP, playerHP, view, fightIndex, isTransitioning, currentEnemy]);

  const confirmRewards = () => {
      const newCards = rewards.filter(r => selectedRewards.includes(r.id)).map(c => ({...c, faceUp: false}));
      // Collect all cards from board to deck
      const allCards = [...stock, ...waste, ...tableau.flat(), ...newCards].map(c => ({...c, faceUp: false}));
      
      setIsTransitioning(true);
      setFightIndex(i => i + 1);
      setView('COMBAT');
      
      // Delay to allow UI transition effect if we had one, but here we just re-init
      setTimeout(() => initFight(allCards), 100);
  };

  // --- Views ---

  if (view === 'GAME_OVER') {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-6xl font-black text-red-600 mb-4 tracking-tighter">CRITICAL FAILURE</h1>
            <p className="text-neutral-400 mb-8 font-mono">AMMUNITION DEPLETED OR VITAL SIGNS ZERO.</p>
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-bold hover:bg-neutral-200">REBOOT SYSTEM</button>
        </div>
      );
  }

  if (view === 'VICTORY') {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-6xl font-black text-blue-500 mb-4 tracking-tighter">MISSION COMPLETE</h1>
            <p className="text-neutral-400 mb-8 font-mono">ALL TARGETS ELIMINATED.</p>
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-bold hover:bg-neutral-200">NEW RUN</button>
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
                        onClick={() => setSelectedRewards(prev => prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id])}
                        isSelected={selectedRewards.includes(card.id)}
                        className={selectedRewards.includes(card.id) ? "ring-4 ring-green-500 bg-neutral-800 scale-105" : ""}
                    />
                ))}
            </div>
            <button onClick={confirmRewards} className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold hover:bg-neutral-200 transition-colors">CONFIRM & PROCEED <ArrowRight size={20} /></button>
        </div>
      );
  }

  return (
    <div className="h-screen bg-neutral-950 text-white overflow-hidden flex flex-col font-mono selection:bg-orange-500 selection:text-black relative">
      
      {/* CARD PREVIEW OVERLAY */}
      <CardPreview card={hoveredCard!} isVisible={!!hoveredCard} />

      {/* FEEDBACK OVERLAY */}
      <AnimatePresence>
        {enemyFeedback && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "fixed inset-0 z-50 pointer-events-none flex items-center justify-center",
                    enemyFeedback === 'ATTACK' ? "bg-red-900/40" : "bg-blue-900/40"
                )}
            >
                <div className="text-6xl font-black tracking-tighter uppercase drop-shadow-2xl">
                    {enemyFeedback === 'ATTACK' ? 'BREACH DETECTED' : 'ENEMY FORTIFIED'}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="flex flex-col gap-2 max-w-5xl mx-auto w-full p-4 shrink-0 bg-neutral-900/50 backdrop-blur-sm border-b border-neutral-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-neutral-900 rounded border border-neutral-700 relative group">
               <Skull className={currentEnemy.isBoss ? "text-purple-500" : "text-red-500"} size={20} />
               <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-neutral-900 px-2 py-1 rounded border border-neutral-700 z-50">
                 {intent.type} {intent.value} ({intent.duration}t)
               </div>
             </div>
             <div>
               <h2 className={cn("text-lg font-bold tracking-widest leading-none", currentEnemy.isBoss ? "text-purple-500" : "text-red-500")}>
                 {currentEnemy.name}
               </h2>
               <div className="flex items-center gap-2 mt-1">
                 <div className="w-32 h-3 bg-neutral-800 rounded-full overflow-hidden relative">
                   <motion.div 
                     className={cn("h-full", currentEnemy.isBoss ? "bg-purple-600" : "bg-red-600")}
                     animate={{ width: `${Math.max(0, (enemyHP / currentEnemy.hp) * 100)}%` }}
                   />
                   {enemyBlock > 0 && <div className="absolute top-0 right-0 h-full bg-blue-500/50 border-l border-white" style={{ width: '20%' }} />}
                 </div>
                 <span className="text-sm font-mono">{enemyHP}</span>
                 {enemyBlock > 0 && <span className="text-blue-400 text-[10px] font-bold">+{enemyBlock}</span>}
               </div>
             </div>
          </div>
          
          <div className="flex flex-col items-end">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Heart className="text-red-500" size={20} fill="currentColor" />
                    <span className="text-xl font-bold">{playerHP}</span>
                    <span className="text-xs text-neutral-500">/ {PLAYER_MAX_HP}</span>
                </div>
                {playerBlock > 0 && (
                    <div className="flex items-center gap-1 text-blue-400">
                        <Shield size={16} />
                        <span className="text-lg font-bold">{playerBlock}</span>
                    </div>
                )}
                
                {/* Log Toggle */}
                <button 
                    onClick={() => setIsLogOpen(!isLogOpen)}
                    className={cn("p-2 rounded border transition-colors", isLogOpen ? "bg-orange-500 text-black border-orange-600" : "bg-neutral-800 border-neutral-700 hover:border-neutral-500")}
                >
                    <List size={16} />
                </button>
              </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative mt-2">
             <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
               {[...Array(Math.min(30, maxTicks))].map((_, i) => (
                 <div key={i} className="absolute h-full w-[1px] bg-neutral-800" style={{ left: `${(i / maxTicks) * 100}%` }} />
               ))}
               <div 
                 className="h-full bg-gradient-to-r from-orange-900 to-orange-500 transition-all duration-300 ease-out"
                 style={{ width: `${Math.min(100, (ticks / maxTicks) * 100)}%` }}
               />
             </div>
             <div className="flex justify-between text-[10px] text-neutral-500 mt-1 uppercase tracking-widest">
                 <span>Timeline</span>
                 <span className={ticks >= maxTicks - 2 ? "text-red-500 animate-pulse font-bold" : ""}>{ticks} / {maxTicks}</span>
             </div>
        </div>
      </header>

      {/* GAME BOARD */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto p-4 pt-2 overflow-hidden relative">
        
        {/* LOG OVERLAY */}
        <AnimatePresence>
            {isLogOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-2 right-4 z-50 w-64 max-h-48 overflow-y-auto bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-lg p-3 text-xs font-mono shadow-2xl"
                >
                      <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">Combat Log</h4>
                      <div className="flex flex-col gap-1 text-neutral-400">
                         {log.map((entry, i) => (
                             <div key={i}><span className="text-orange-900 mr-2">{'>'}</span>{entry}</div>
                         ))}
                      </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* TOP ROW: STOCK | WASTE */}
        <div className="flex gap-8 h-48 shrink-0 mb-4 justify-center">
            {/* Stock */}
            <div className="flex flex-col gap-2 items-center">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Stock ({stock.length})</span>
                <div 
                    onClick={drawStock}
                    className="w-28 h-40 rounded-lg bg-neutral-800 border-2 border-neutral-700 shadow-md flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors relative"
                >
                    {stock.length > 0 ? (
                        <div className="w-16 h-28 border border-neutral-600 rounded bg-neutral-700/50 flex items-center justify-center">
                             <div className="w-6 h-6 rounded-full border-2 border-neutral-600 bg-neutral-800" />
                        </div>
                    ) : (
                        <RefreshCw className="text-neutral-600" />
                    )}
                </div>
            </div>

            {/* Waste */}
            <div className="flex flex-col gap-2 items-center">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Waste</span>
                <div className="w-28 h-40 relative flex items-center justify-center">
                    <AnimatePresence mode="popLayout">
                        {waste.length > 0 ? (
                            waste.map((card, cardIndex) => {
                                const isTop = cardIndex === waste.length - 1;
                                const offset = cardIndex * 20;
                                
                                return (
                                    <div 
                                        key={card.id} 
                                        className="absolute transition-all"
                                        style={{ 
                                            top: offset, 
                                            zIndex: cardIndex,
                                        }}
                                    >
                                        <motion.div
                                            drag={isTop && card.faceUp}
                                            dragSnapToOrigin
                                            dragMomentum={false}
                                            onDragEnd={(e, info) => isTop && card.faceUp && handleDragEnd(e, info, card, 'WASTE')}
                                            whileDrag={{ scale: 1.1, zIndex: 100 }}
                                            className={cn(isTop && card.faceUp ? "cursor-grab active:cursor-grabbing" : "")}
                                        >
                                            <CardComponent 
                                                card={card}
                                                onClick={isTop ? () => handleCardClick(card, 'WASTE') : undefined}
                                                onHoverStart={() => card.faceUp && setHoveredCard(card)}
                                                onHoverEnd={() => setHoveredCard(null)}
                                                isSelected={selectedCardId === card.id}
                                                isDraggable={false} // Handled by wrapper for simpler stacking context
                                            />
                                        </motion.div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="w-28 h-40 rounded-lg border-2 border-dashed border-neutral-800 flex items-center justify-center text-neutral-700">
                                EMPTY
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* BOTTOM ROW: TABLEAU */}
        <div className="flex-1 relative">
            <div className="absolute top-0 left-0 w-full h-full grid grid-cols-3 gap-4">
                {tableau.map((pile, pileIndex) => (
                    <div 
                        key={pileIndex} 
                        className="relative flex flex-col items-center min-h-[200px] rounded-xl transition-colors pb-32"
                        data-pile-index={pileIndex}
                    >
                        {/* Pile Base / Drop Zone Indicator */}
                        <div className="absolute top-0 w-28 h-40 rounded-lg border-2 border-dashed border-neutral-800/30 bg-neutral-900/10 pointer-events-none" />
                        
                        {pile.map((card, cardIndex) => {
                            const isTop = cardIndex === pile.length - 1;
                            const offset = cardIndex * 24; 
                            
                            return (
                                <div 
                                    key={card.id} 
                                    className="absolute transition-all"
                                    style={{ 
                                        top: offset, 
                                        zIndex: cardIndex,
                                    }}
                                >
                                    <motion.div
                                        drag={isTop && card.faceUp}
                                        dragSnapToOrigin
                                        dragMomentum={false}
                                        onDragEnd={(e, info) => isTop && card.faceUp && handleDragEnd(e, info, card, 'TABLEAU', pileIndex)}
                                        whileDrag={{ scale: 1.1, zIndex: 100 }}
                                        className={cn(isTop && card.faceUp ? "cursor-grab active:cursor-grabbing" : "")}
                                    >
                                        <CardComponent 
                                            card={card}
                                            onClick={isTop && card.faceUp ? () => handleCardClick(card, 'TABLEAU', pileIndex) : undefined}
                                            onHoverStart={() => card.faceUp && setHoveredCard(card)}
                                            onHoverEnd={() => setHoveredCard(null)}
                                            isSelected={selectedCardId === card.id}
                                            isDraggable={false} // Handled by wrapper for simpler stacking context
                                        />
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>

      </main>

      {/* FOOTER ACTION BAR */}
      <footer className="shrink-0 p-4 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex justify-between items-center relative z-40">
            <div className="text-[10px] text-neutral-500 font-mono hidden md:block">
                v0.2.2-BETA
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <button 
                    onClick={playSelectedCard}
                    disabled={!selectedCardId}
                    className={cn(
                        "flex items-center gap-2 px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all",
                        selectedCardId 
                           ? "bg-white text-black hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                           : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                    )}
                >
                    <Zap size={18} className={selectedCardId ? "fill-black" : ""} />
                    {selectedCardId ? `PLAY CARD (+1 Tick)` : 'SELECT CARD'}
                </button>
            </div>
            
            <div className="flex gap-4 text-xs text-neutral-500 font-mono">
                <div>DRAG = STACK</div>
                <div>CLICK = SELECT</div>
                <div>HOVER = PREVIEW</div>
            </div>
      </footer>
    </div>
  )
}

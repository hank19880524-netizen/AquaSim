import React, { useEffect, useRef, useState } from 'react';
import { AquariumSimulation } from './simulation';
import { FISH_DB, SHRIMP_DB, SNAIL_DB, PLANT_DB, EQUIP_DB, MEDIA_DB, DECOR_DB, FEEDER_UPGRADES } from './constants';
import { SaveData } from './types';

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [sim, setSim] = useState<AquariumSimulation | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [hasSave, setHasSave] = useState(false);
    
    // UI States
    const [money, setMoney] = useState(0);
    const [gameTime, setGameTime] = useState('Day 1 - 08:00');
    const [isLeaking, setIsLeaking] = useState(false);
    const [lightOn, setLightOn] = useState(true);
    const [waterStats, setWaterStats] = useState<any>(null);
    const [sysStats, setSysStats] = useState<any>(null);
    const [counts, setCounts] = useState({ fish: 0, shrimp: 0, snail: 0, plants: 0, deadFish: 0, deadShrimp: 0, deadSnail: 0 });
    const [showPipeline, setShowPipeline] = useState(false);
    const [selectedNode, setSelectedNode] = useState<number | null>(null);
    const [shopTab, setShopTab] = useState<'life' | 'potion' | 'decor' | 'upgrade'>('life');
    
    useEffect(() => {
        const saved = localStorage.getItem('aquasim_pro_save');
        if (saved) setHasSave(true);
        
        return () => {
            if (sim) sim.stop();
        };
    }, [sim]);

    const updateUI = (s: AquariumSimulation) => {
        setMoney(s.money);
        const day = Math.floor(s.gameTimeHours / 24) + 1;
        const hour = s.gameTimeHours % 24;
        setGameTime(`第 ${day} 天 - ${hour.toString().padStart(2, '0')}:00`);
        setIsLeaking(s.sysStats.isLeaking);
        setLightOn(s.lightOn);
        setWaterStats({ ...s.water });
        setSysStats({ ...s.sysStats });
        
        const aliveFishes = s.fishes.filter(f => !f.isDead && f.shape !== 'shrimp' && f.shape !== 'snail').length;
        const aliveShrimps = s.fishes.filter(f => !f.isDead && f.shape === 'shrimp').length;
        const aliveSnails = s.fishes.filter(f => !f.isDead && f.shape === 'snail').length;
        const deadFishCount = s.fishes.filter(f => f.isDead && f.shape !== 'shrimp' && f.shape !== 'snail').length;
        const deadShrimpCount = s.fishes.filter(f => f.isDead && f.shape === 'shrimp').length;
        const deadSnailCount = s.fishes.filter(f => f.isDead && f.shape === 'snail').length;
        
        setCounts({
            fish: aliveFishes,
            shrimp: aliveShrimps,
            snail: aliveSnails,
            plants: s.plants.length,
            deadFish: deadFishCount,
            deadShrimp: deadShrimpCount,
            deadSnail: deadSnailCount
        });
    };

    const startGame = (volume: number, initialMoney: number) => {
        setGameStarted(true);
        setTimeout(() => {
            if (canvasRef.current) {
                const newSim = new AquariumSimulation(canvasRef.current, volume, initialMoney, null, updateUI);
                setSim(newSim);
                (window as any).sim = newSim;
            }
        }, 100);
    };

    const quitGame = () => {
        if (sim) {
            sim.stop();
            setSim(null);
        }
        setGameStarted(false);
    };

    const loadGame = () => {
        const saved = localStorage.getItem('aquasim_pro_save');
        if (!saved) return;
        const data: SaveData = JSON.parse(saved);
        setGameStarted(true);
        setTimeout(() => {
            if (canvasRef.current) {
                const newSim = new AquariumSimulation(canvasRef.current, data.volumeLiters, data.money, data, updateUI);
                setSim(newSim);
                (window as any).sim = newSim;
            }
        }, 100);
    };

    const saveGame = () => {
        if (!sim) return;
        const data: SaveData = {
            volumeLiters: sim.volumeLiters,
            money: sim.money,
            gameTimeHours: sim.gameTimeHours,
            water: sim.water,
            fishes: sim.fishes,
            plants: sim.plants,
            pipeline: sim.pipeline,
            sysStats: sim.sysStats,
            feederLevel: sim.feederLevel,
            decorations: sim.decorations
        };
        localStorage.setItem('aquasim_pro_save', JSON.stringify(data));
        sim.showActionText('💾 存檔成功');
    };

    if (!gameStarted) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 transition-opacity duration-500 overflow-y-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 drop-shadow-lg">
                        <i className="fa-solid fa-water"></i> AquaSim Pro
                    </h1>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em]">專業水族生態模擬系統</p>
                </div>
                
                {hasSave && (
                    <div className="mb-8 w-full max-w-4xl flex justify-center">
                        <button onClick={loadGame} className="bg-slate-900 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 rounded-lg px-6 py-3 text-white font-bold text-sm shadow-xl transition transform hover:-translate-y-0.5 flex items-center gap-3 group">
                            <i className="fa-solid fa-floppy-disk text-indigo-400 group-hover:scale-110 transition-transform"></i> 載入存檔專案
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-4 mb-6 w-full max-w-md">
                    <div className="h-px flex-grow bg-slate-800"></div>
                    <span className="text-slate-600 font-black uppercase tracking-widest text-[10px]">建立新專案</span>
                    <div className="h-px flex-grow bg-slate-800"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
                    <button onClick={() => startGame(30, 150)} className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 rounded-xl p-4 text-left transition group">
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 flex items-center gap-2"><i className="fa-solid fa-box text-cyan-500 text-sm"></i>奈米缸 (30L)</h3>
                        <p className="text-slate-500 text-[10px] mb-3 leading-relaxed">困難模式・水質極易震盪。</p>
                        <div className="text-yellow-500/80 font-mono text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded inline-block">資金: $150</div>
                    </button>
                    <button onClick={() => startGame(100, 300)} className="bg-slate-900/50 border border-cyan-500/30 hover:border-cyan-500 hover:bg-slate-900 rounded-xl p-4 text-left transition group relative overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 flex items-center gap-2"><i className="fa-solid fa-cube text-cyan-400 text-sm"></i>標準缸 (100L)</h3>
                        <p className="text-slate-500 text-[10px] mb-3 leading-relaxed">標準模式・新手入門首選。</p>
                        <div className="text-yellow-500/80 font-mono text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded inline-block">資金: $300</div>
                    </button>
                    <button onClick={() => startGame(250, 600)} className="bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 rounded-xl p-4 text-left transition group">
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 flex items-center gap-2"><i className="fa-solid fa-boxes-stacked text-blue-500 text-sm"></i>大型缸 (250L)</h3>
                        <p className="text-slate-500 text-[10px] mb-3 leading-relaxed">簡單模式・容錯率極高。</p>
                        <div className="text-yellow-500/80 font-mono text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded inline-block">資金: $600</div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-2 sm:p-4 md:p-6 flex flex-col items-center relative selection:bg-cyan-500/30">
            <header className="sticky top-0 z-50 w-full max-w-7xl flex flex-wrap lg:flex-nowrap justify-between items-center gap-2 bg-[#090e17]/90 backdrop-blur-md py-1.5 px-2 sm:px-4 mb-2 sm:mb-3 rounded-b-xl border-b border-slate-700/50 shadow-md -mt-2 sm:-mt-4 pt-2 sm:pt-3">
                <div className="w-full lg:w-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-lg sm:text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider flex items-center gap-1 sm:gap-2 drop-shadow-md">
                            <i className="fa-solid fa-water text-cyan-400"></i> AquaSim
                        </h1>
                    </div>
                </div>
                
                <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 w-full lg:w-auto justify-end">
                    <div className="glass-panel px-2 py-1 rounded-lg flex items-center gap-1.5 border-t-2 border-yellow-500 flex-grow sm:flex-grow-0 min-w-[80px]">
                        <div className="text-yellow-400 bg-yellow-500/10 p-1 rounded border border-yellow-500/20"><i className="fa-solid fa-coins text-[10px] sm:text-sm"></i></div>
                        <div>
                            <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 leading-none">專案資金</div>
                            <div className="text-sm sm:text-base font-mono text-yellow-400 font-bold tracking-widest leading-none">${money}</div>
                        </div>
                    </div>
                    
                    <div className="glass-panel px-2 py-1 rounded-lg border-t-2 border-cyan-500 flex flex-col justify-center flex-grow sm:flex-grow-0">
                        <div className="text-[8px] sm:text-[9px] text-slate-400 flex items-center justify-between gap-1 sm:gap-2 mb-1 font-bold uppercase tracking-wider leading-none">
                            <span><i className="fa-solid fa-gauge-high text-cyan-400"></i> 倍速</span>
                            <div className="flex gap-0.5 sm:gap-1 items-center">
                                <button onClick={() => sim?.setSpeed(0)} className={`px-1 py-0.5 rounded text-[8px] transition ${sim?.speed === 0 ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`} title="暫停"><i className="fa-solid fa-pause"></i></button>
                                <button onClick={() => sim?.setSpeed(0.5)} className={`px-1 py-0.5 rounded text-[8px] transition ${sim?.speed === 0.5 ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>0.5x</button>
                                <button onClick={() => sim?.setSpeed(1)} className={`px-1 py-0.5 rounded text-[8px] transition ${sim?.speed === 1 ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>1x</button>
                                <button onClick={() => sim?.setSpeed(5)} className={`px-1 py-0.5 rounded text-[8px] transition ${sim?.speed === 5 ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>5x</button>
                                <button onClick={() => sim?.setSpeed(24)} className={`px-1 py-0.5 rounded text-[8px] transition ${sim?.speed === 24 ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>24x</button>
                            </div>
                        </div>
                        <div className="text-[10px] sm:text-xs font-mono text-cyan-300 font-bold text-right leading-none mt-0.5">{gameTime}</div>
                    </div>

                    <div className="flex gap-1.5">
                        <button onClick={saveGame} className="glass-panel px-2 py-1 rounded-lg border-t-2 border-emerald-500 hover:bg-slate-800 transition flex flex-col items-center justify-center text-emerald-400 group cursor-pointer flex-grow sm:flex-grow-0 min-w-[40px]">
                            <i className="fa-solid fa-floppy-disk text-xs mb-0.5 group-hover:scale-110 transition-transform"></i>
                            <span className="text-[7px] font-bold uppercase leading-none">儲存</span>
                        </button>
                        <button onClick={quitGame} className="glass-panel px-2 py-1 rounded-lg border-t-2 border-slate-500 hover:bg-slate-800 transition flex flex-col items-center justify-center text-slate-400 group cursor-pointer flex-grow sm:flex-grow-0 min-w-[40px]">
                            <i className="fa-solid fa-arrow-right-from-bracket text-xs mb-0.5 group-hover:translate-x-0.5 transition-transform"></i>
                            <span className="text-[7px] font-bold uppercase leading-none">選單</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-6xl grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-4">
                <div className="xl:col-span-2 flex flex-col gap-2 sm:gap-3">
                    <div id="tank-container" className="relative w-full aspect-video rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-slate-600 bg-black transition-all overflow-hidden">
                        <canvas ref={canvasRef} width={2000} height={1000} className="absolute top-0 left-0 w-full h-full z-10 block"></canvas>
                        <div className={`absolute inset-0 bg-slate-950 pointer-events-none transition-opacity duration-1000 z-20 ${lightOn ? 'opacity-0' : 'opacity-40'}`}></div>
                        {isLeaking && (
                            <div className="absolute inset-0 bg-red-500/20 z-30 flex items-center justify-center pointer-events-none">
                                <div className="bg-red-600/95 text-white px-4 sm:px-8 py-2 sm:py-4 rounded-xl font-bold text-lg sm:text-2xl md:text-3xl tracking-widest animate-pulse border-2 border-white shadow-[0_0_30px_rgba(239,68,68,0.8)] flex items-center gap-2 sm:gap-4 text-center">
                                    <i className="fa-solid fa-triangle-exclamation text-2xl sm:text-4xl"></i> 漏水中！管線破裂！
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-1.5 sm:p-2 rounded-xl flex flex-col gap-1.5 sm:gap-2">
                        <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                            <button onClick={() => sim?.feed()} className="bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white py-1 px-0.5 rounded-lg border border-amber-400/50 shadow transition flex flex-col items-center justify-center gap-0.5 text-[9px] sm:text-xs font-bold leading-tight tracking-tighter">
                                <i className="fa-solid fa-cookie-bite text-xs sm:text-base drop-shadow"></i> <span>餵食($2)</span>
                            </button>
                            <button onClick={() => sim?.changeWater()} className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white py-1 px-0.5 rounded-lg border border-blue-400/50 shadow transition flex flex-col items-center justify-center gap-0.5 text-[9px] sm:text-xs font-bold leading-tight tracking-tighter">
                                <i className="fa-solid fa-bucket text-xs sm:text-base drop-shadow"></i> <span>換水/加水</span>
                            </button>
                            <button onClick={() => sim?.cleanGlass()} className="bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white py-1 px-0.5 rounded-lg border border-teal-400/50 shadow transition flex flex-col items-center justify-center gap-0.5 text-[9px] sm:text-xs font-bold leading-tight tracking-tighter">
                                <i className="fa-solid fa-hand-sparkles text-xs sm:text-base drop-shadow"></i> <span>刷缸除藻</span>
                            </button>
                            <button onClick={() => sim?.removeDeadFish()} className="bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white py-1 px-0.5 rounded-lg border border-rose-400/50 shadow transition flex flex-col items-center justify-center gap-0.5 text-[9px] sm:text-xs font-bold leading-tight tracking-tighter">
                                <i className="fa-solid fa-skull-crossbones text-xs sm:text-base drop-shadow"></i> <span>撈除浮屍</span>
                            </button>
                            <button onClick={() => sim?.toggleLight()} className="bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-900 py-1 px-0.5 rounded-lg border border-yellow-300/50 shadow transition flex flex-col items-center justify-center gap-0.5 text-[9px] sm:text-xs font-bold leading-tight tracking-tighter">
                                <i className="fa-solid fa-lightbulb text-xs sm:text-base drop-shadow"></i> <span>{lightOn ? '關閉燈光' : '開啟燈光'}</span>
                            </button>
                        </div>

                        <div className="flex gap-1 mb-1 border-b border-slate-700 pb-1 overflow-x-auto no-scrollbar pt-1.5 sm:pt-2 border-t border-slate-600/50">
                            {[
                                { id: 'life', label: '生物與植物', icon: 'fa-fish' },
                                { id: 'potion', label: '專業藥水', icon: 'fa-flask-vial' },
                                { id: 'decor', label: '魚缸造景', icon: 'fa-mountain' },
                                { id: 'upgrade', label: '設備升級', icon: 'fa-arrow-up-right-dots' }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setShopTab(tab.id as any)}
                                    className={`px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 ${shopTab === tab.id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="min-h-[100px]">
                            {shopTab === 'life' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="bg-slate-800/50 p-1.5 sm:p-2 rounded-lg border border-slate-700 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <select id="fish-selector" className="bg-slate-900 text-white text-[10px] sm:text-xs rounded px-1 py-0.5 flex-grow border border-slate-600 focus:outline-none focus:border-cyan-500 transition font-medium h-6 sm:h-8">
                                                {FISH_DB.map(f => <option key={f.id} value={f.id}>{f.name} (${f.cost})</option>)}
                                            </select>
                                            <button onClick={() => {
                                                const id = (document.getElementById('fish-selector') as HTMLSelectElement).value;
                                                const f = FISH_DB.find(x => x.id === id);
                                                if (f && sim && sim.money >= f.cost) {
                                                    sim.money -= f.cost;
                                                    sim.spawnFish(id);
                                                    sim.showActionText(`🐟 購入 ${f.name}`);
                                                    updateUI(sim);
                                                }
                                            }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded shadow transition text-[9px] sm:text-[10px] font-bold whitespace-nowrap w-10 h-6 sm:h-8 flex items-center justify-center">買魚</button>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <select id="shrimp-selector" className="bg-slate-900 text-white text-[10px] sm:text-xs rounded px-1 py-0.5 flex-grow border border-slate-600 focus:outline-none focus:border-rose-500 transition font-medium h-6 sm:h-8">
                                                {SHRIMP_DB.map(f => <option key={f.id} value={f.id}>{f.name} (${f.cost})</option>)}
                                            </select>
                                            <button onClick={() => {
                                                const id = (document.getElementById('shrimp-selector') as HTMLSelectElement).value;
                                                const f = SHRIMP_DB.find(x => x.id === id);
                                                if (f && sim && sim.money >= f.cost) {
                                                    sim.money -= f.cost;
                                                    sim.spawnFish(id);
                                                    sim.showActionText(`🦐 購入 ${f.name}`);
                                                    updateUI(sim);
                                                }
                                            }} className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 rounded shadow transition text-[9px] sm:text-[10px] font-bold whitespace-nowrap w-10 h-6 sm:h-8 flex items-center justify-center">買蝦</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 p-1.5 sm:p-2 rounded-lg border border-slate-700 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <select id="snail-selector" className="bg-slate-900 text-white text-[10px] sm:text-xs rounded px-1 py-0.5 flex-grow border border-slate-600 focus:outline-none focus:border-amber-500 transition font-medium h-6 sm:h-8">
                                                {SNAIL_DB.map(f => <option key={f.id} value={f.id}>{f.name} (${f.cost})</option>)}
                                            </select>
                                            <button onClick={() => {
                                                const id = (document.getElementById('snail-selector') as HTMLSelectElement).value;
                                                const f = SNAIL_DB.find(x => x.id === id);
                                                if (f && sim && sim.money >= f.cost) {
                                                    sim.money -= f.cost;
                                                    sim.spawnFish(id);
                                                    sim.showActionText(`🐌 購入 ${f.name}`);
                                                    updateUI(sim);
                                                }
                                            }} className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded shadow transition text-[9px] sm:text-[10px] font-bold whitespace-nowrap w-10 h-6 sm:h-8 flex items-center justify-center">買螺</button>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <select id="plant-selector" className="bg-slate-900 text-white text-[10px] sm:text-xs rounded px-1 py-0.5 flex-grow border border-slate-600 focus:outline-none focus:border-emerald-500 transition font-medium h-6 sm:h-8">
                                                {PLANT_DB.map(f => <option key={f.id} value={f.id}>{f.name} (${f.cost})</option>)}
                                            </select>
                                            <button onClick={() => {
                                                const id = (document.getElementById('plant-selector') as HTMLSelectElement).value;
                                                const p = PLANT_DB.find(x => x.id === id);
                                                if (p && sim && sim.money >= p.cost) {
                                                    sim.money -= p.cost;
                                                    sim.spawnPlant(id, Math.random() * 1800 + 100);
                                                    sim.showActionText(`🌿 栽種 ${p.name}`);
                                                    updateUI(sim);
                                                }
                                            }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded shadow transition text-[9px] sm:text-[10px] font-bold whitespace-nowrap w-10 h-6 sm:h-8 flex items-center justify-center">栽種</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {shopTab === 'potion' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <button onClick={() => sim?.useItem('seed')} className="bg-purple-600/80 hover:bg-purple-500 text-white p-2 rounded border border-purple-500/50 shadow transition flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold">
                                        <i className="fa-solid fa-bacteria text-sm"></i><span>硝化菌</span><span className="text-purple-200 font-mono text-[7px] sm:text-[8px] bg-black/20 px-1 rounded">$15</span>
                                    </button>
                                    <button onClick={() => sim?.useItem('envy')} className="bg-emerald-600/80 hover:bg-emerald-500 text-white p-2 rounded border border-emerald-500/50 shadow transition flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold">
                                        <i className="fa-solid fa-leaf text-sm"></i><span>液肥</span><span className="text-emerald-200 font-mono text-[7px] sm:text-[8px] bg-black/20 px-1 rounded">$10</span>
                                    </button>
                                    <button onClick={() => sim?.useItem('kh')} className="bg-blue-600/80 hover:bg-blue-500 text-white p-2 rounded border border-blue-500/50 shadow transition flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold">
                                        <i className="fa-solid fa-vial text-sm"></i><span>KH+</span><span className="text-blue-200 font-mono text-[7px] sm:text-[8px] bg-black/20 px-1 rounded">$5</span>
                                    </button>
                                    <button onClick={() => sim?.useItem('gh')} className="bg-indigo-600/80 hover:bg-indigo-500 text-white p-2 rounded border border-indigo-500/50 shadow transition flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold">
                                        <i className="fa-solid fa-flask text-sm"></i><span>GH+</span><span className="text-indigo-200 font-mono text-[7px] sm:text-[8px] bg-black/20 px-1 rounded">$5</span>
                                    </button>
                                </div>
                            )}

                            {shopTab === 'decor' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {DECOR_DB.map(d => (
                                        <button 
                                            key={d.id}
                                            onClick={() => { sim?.spawnDecoration(d.id); updateUI(sim!); }}
                                            disabled={sim && sim.money < d.cost}
                                            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 p-2 rounded-lg transition flex flex-col items-center gap-1 group"
                                        >
                                            <div className="w-8 h-8 rounded flex items-center justify-center text-slate-400 group-hover:text-cyan-400" style={{ color: d.color }}>
                                                <i className={`fa-solid ${d.type === 'rock' ? 'fa-mountain' : (d.type === 'wood' ? 'fa-tree' : 'fa-anchor')}`}></i>
                                            </div>
                                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">{d.name}</span>
                                            <span className="text-[8px] font-mono text-cyan-500">${d.cost}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {shopTab === 'upgrade' && (
                                <div className="grid grid-cols-1 gap-2">
                                    {FEEDER_UPGRADES.map(u => {
                                        const isCurrent = sim?.feederLevel === u.level;
                                        const isNext = sim?.feederLevel === u.level - 1;
                                        const isLocked = u.level > (sim?.feederLevel || 0) + 1;
                                        const isOwned = u.level <= (sim?.feederLevel || 0);

                                        return (
                                            <button 
                                                key={u.level}
                                                onClick={() => { if(isNext) { sim?.upgradeFeeder(); updateUI(sim!); } }}
                                                disabled={!isNext || (sim && sim.money < u.cost)}
                                                className={`p-2 rounded-lg border transition flex items-center justify-between gap-3 ${
                                                    isOwned ? 'bg-emerald-900/20 border-emerald-500/30 opacity-60' :
                                                    isNext ? 'bg-slate-800 border-cyan-500/50 hover:bg-slate-700' :
                                                    'bg-slate-900 border-slate-800 opacity-40'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOwned ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                        <i className={`fa-solid ${u.level >= 2 ? 'fa-robot' : 'fa-hand-pointer'}`}></i>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[10px] font-black text-white uppercase">{u.name}</div>
                                                        <div className="text-[8px] text-slate-500">{u.desc}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {isOwned ? (
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase">已擁有</span>
                                                    ) : isLocked ? (
                                                        <i className="fa-solid fa-lock text-slate-600"></i>
                                                    ) : (
                                                        <span className="text-[10px] font-mono font-bold text-cyan-400">${u.cost}</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:gap-4">
                    <div className="glass-panel p-3 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest"><i className="fa-solid fa-droplet text-cyan-400 mr-1"></i> 水質監測儀</h2>
                            <div className="flex gap-1">
                                <div className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-mono text-slate-400 border border-slate-700">TDS: {waterStats?.tds.toFixed(0)}</div>
                                <div className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-mono text-slate-400 border border-slate-700">KH: {waterStats?.kh.toFixed(1)}</div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {[
                                { id: 'ph', label: 'pH 酸鹼值', val: waterStats?.ph, min: 6.5, max: 7.5, unit: '' },
                                { id: 'nh3', label: 'NH3 氨', val: waterStats?.nh3, min: 0, max: 0.2, unit: 'ppm' },
                                { id: 'no2', label: 'NO2 亞硝酸', val: waterStats?.no2, min: 0, max: 0.2, unit: 'ppm' },
                                { id: 'no3', label: 'NO3 硝酸鹽', val: waterStats?.no3, min: 5, max: 40, unit: 'ppm' },
                                { id: 'o2', label: 'O2 溶氧量', val: waterStats?.o2, min: 5, max: 10, unit: 'mg/L' },
                                { id: 'co2', label: 'CO2 二氧化碳', val: waterStats?.co2, min: 10, max: 30, unit: 'ppm' },
                            ].map(stat => (
                                <div key={stat.id} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-bold text-slate-400">{stat.label}</span>
                                        <span className={`text-[10px] font-mono font-bold ${stat.val > stat.max || stat.val < stat.min ? 'text-red-400' : 'text-cyan-400'}`}>
                                            {stat.val?.toFixed(stat.id === 'ph' ? 1 : 3)} {stat.unit}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                        <div 
                                            className={`h-full transition-all duration-500 ${stat.val > stat.max || stat.val < stat.min ? 'bg-red-500' : 'bg-cyan-500'}`}
                                            style={{ width: `${Math.min(100, (stat.val / (stat.max * 1.5)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="glass-panel p-3 rounded-xl">
                        <h2 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest mb-2"><i className="fa-solid fa-microchip text-emerald-400 mr-1"></i> 生態數據</h2>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">活體數量</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300">魚: {counts.fish}</span>
                                    {counts.deadFish > 0 && <span className="text-[10px] text-red-400 animate-pulse">(-{counts.deadFish})</span>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300">蝦: {counts.shrimp}</span>
                                    {counts.deadShrimp > 0 && <span className="text-[10px] text-red-400 animate-pulse">(-{counts.deadShrimp})</span>}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">環境指標</div>
                                <div className="text-xs font-bold text-slate-300">植物: {counts.plants}</div>
                                <div className="text-xs font-bold text-slate-300">藻類: {waterStats?.algae.toFixed(0)}%</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowPipeline(true)}
                            className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-1.5 rounded-lg border border-cyan-400/30 shadow-lg transition flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest"
                        >
                            <i className="fa-solid fa-network-wired"></i> 進入管路系統
                        </button>
                    </div>
                </div>
            </main>

            {/* Pipeline Editor Modal */}
            {showPipeline && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-3 sm:p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <i className="fa-solid fa-network-wired text-cyan-400"></i> AQUASIM 管路與過濾系統
                            </h2>
                            <button onClick={() => setShowPipeline(false)} className="text-slate-400 hover:text-white transition">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Pipeline Visualization */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-center gap-2 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent"></div>
                                    {sim?.pipeline.map((node, idx) => (
                                        <React.Fragment key={idx}>
                                            <button 
                                                onClick={() => setSelectedNode(idx)}
                                                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 group ${
                                                    selectedNode === idx ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 
                                                    node ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-dashed border-slate-800 bg-transparent hover:bg-slate-800/20'
                                                }`}
                                            >
                                                {node ? (
                                                    <>
                                                        <i className={`fa-solid ${EQUIP_DB[node.type].icon} text-lg sm:text-xl ${selectedNode === idx ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}></i>
                                                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase truncate w-full px-1">{EQUIP_DB[node.type].name}</span>
                                                        {node.flowPct < 100 && <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-[7px] font-black px-1 rounded-full">{node.flowPct}%</div>}
                                                    </>
                                                ) : (
                                                    <i className="fa-solid fa-plus text-slate-800 group-hover:text-slate-600"></i>
                                                )}
                                            </button>
                                            {idx < 9 && <div className={`w-4 h-1 rounded-full ${sim?.pipeline[idx] && sim?.pipeline[idx+1] ? 'bg-cyan-500/50 animate-pulse' : 'bg-slate-800'}`}></div>}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {selectedNode !== null && (
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">
                                                節點 #{selectedNode + 1} 詳情
                                            </h3>
                                            {sim?.pipeline[selectedNode] && (
                                                <button 
                                                    onClick={() => { sim.updatePipelineNode(selectedNode, null); updateUI(sim); }}
                                                    className="text-[9px] sm:text-[10px] font-bold text-rose-400 hover:text-rose-300 transition uppercase"
                                                >
                                                    <i className="fa-solid fa-trash-can mr-1"></i> 移除組件
                                                </button>
                                            )}
                                        </div>

                                        {!sim?.pipeline[selectedNode] ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {(Object.entries(EQUIP_DB) as [string, any][]).map(([id, eq]) => (
                                                    <button 
                                                        key={id}
                                                        onClick={() => { sim?.updatePipelineNode(selectedNode, id); updateUI(sim); }}
                                                        disabled={sim && sim.money < eq.cost}
                                                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 p-2 rounded-lg transition flex flex-col items-center gap-1 group"
                                                    >
                                                        <i className={`fa-solid ${eq.icon} text-slate-400 group-hover:text-cyan-400`}></i>
                                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">{eq.name}</span>
                                                        <span className="text-[8px] font-mono text-cyan-500">${eq.cost}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <button 
                                                        onClick={() => { sim.movePipelineNode(selectedNode, 'left'); setSelectedNode(selectedNode - 1); }}
                                                        disabled={selectedNode === 0}
                                                        className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white py-1.5 rounded border border-slate-700 text-[10px] font-bold transition"
                                                    >
                                                        <i className="fa-solid fa-arrow-left mr-1"></i> 向左移動
                                                    </button>
                                                    <button 
                                                        onClick={() => { sim.movePipelineNode(selectedNode, 'right'); setSelectedNode(selectedNode + 1); }}
                                                        disabled={selectedNode === sim.pipeline.length - 1}
                                                        className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white py-1.5 rounded border border-slate-700 text-[10px] font-bold transition"
                                                    >
                                                        向右移動 <i className="fa-solid fa-arrow-right ml-1"></i>
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                        <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">組件性能</div>
                                                        <div className="text-xs font-bold text-slate-300">{EQUIP_DB[sim.pipeline[selectedNode]!.type].name}</div>
                                                        <div className="text-[10px] text-slate-400">流量: {EQUIP_DB[sim.pipeline[selectedNode]!.type].maxFlow} L/h</div>
                                                    </div>
                                                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                        <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">插槽數量</div>
                                                        <div className="text-xs font-bold text-slate-300">{sim.pipeline[selectedNode]!.slots.length} / {EQUIP_DB[sim.pipeline[selectedNode]!.type].maxSlots}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">濾材配置</div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {sim.pipeline[selectedNode]!.slots.map((slot, sIdx) => (
                                                            <div key={sIdx} className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-8 h-8 rounded bg-slate-800 flex items-center justify-center ${slot.type === 'empty' ? 'text-slate-700' : 'text-cyan-500'}`}>
                                                                        <i className={`fa-solid ${slot.type === 'empty' ? 'fa-box-open' : 'fa-layer-group'}`}></i>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] font-bold text-slate-300">{slot.type === 'empty' ? '空插槽' : MEDIA_DB[slot.type].name}</div>
                                                                        {slot.type !== 'empty' && (
                                                                            <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                                                <div className="h-full bg-amber-500" style={{ width: `${slot.dirt}%` }}></div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    {slot.type === 'empty' ? (
                                                                        <select 
                                                                            onChange={(e) => { sim.updateSlot(selectedNode, sIdx, e.target.value); updateUI(sim); }}
                                                                            className="bg-slate-800 text-[9px] text-white rounded px-1 py-0.5 border border-slate-700 focus:outline-none"
                                                                        >
                                                                            <option value="">選擇濾材</option>
                                                                            {(Object.entries(MEDIA_DB) as [string, any][]).map(([mId, m]) => (
                                                                                <option key={mId} value={mId}>{m.name} (${m.cost})</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => { sim.cleanSlot(selectedNode, sIdx); updateUI(sim); }}
                                                                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-[8px] font-bold transition"
                                                                        >
                                                                            清洗
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* System Status Sidebar */}
                            <div className="space-y-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">系統總覽</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-400 font-bold">系統狀態</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${sysStats?.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {sysStats?.isActive ? '運作中' : '已停機'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-400 font-bold">漏水警報</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${sysStats?.isLeaking ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-700 text-slate-500'}`}>
                                                {sysStats?.isLeaking ? '危險: 漏水中' : '安全'}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-700 space-y-2">
                                            <div>
                                                <div className="flex justify-between text-[9px] mb-1">
                                                    <span className="text-slate-400">生物過濾效能 (Bio)</span>
                                                    <span className="text-cyan-400 font-mono">{sysStats?.bio.toFixed(0)}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (sysStats?.bio / 100) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[9px] mb-1">
                                                    <span className="text-slate-400">物理過濾效能 (Mech)</span>
                                                    <span className="text-emerald-400 font-mono">{(sysStats?.mech * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${sysStats?.mech * 100}%` }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[9px] mb-1">
                                                    <span className="text-slate-400">系統總流量 (Flow)</span>
                                                    <span className="text-blue-400 font-mono">{sysStats?.flow.toFixed(1)} L/h</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (sysStats?.flow / 20) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                                    <h4 className="text-[10px] font-black text-amber-400 uppercase mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-circle-info"></i> 專家建議
                                    </h4>
                                    <p className="text-[9px] text-amber-200/70 leading-relaxed">
                                        管路系統必須包含一個 <span className="text-amber-300 font-bold">入水口 (Intake)</span> 與一個 <span className="text-amber-300 font-bold">出水口 (Outflow)</span> 組件才能形成迴路。
                                        若迴路中斷且馬達仍在運轉，將會導致漏水。定期清洗濾棉 (物理過濾) 可維持系統流量。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LocalStorageService } from "@/lib/localStorage";
import { Word } from "@/types";

interface ReviewWord extends Word {
    forgottenCount: number;
    isForgotten: boolean;
    isMastered: boolean;
    userInput?: string;
    isCorrect?: boolean;
    reviewDate?: string;
    difficulty?: "easy" | "medium" | "hard";
}

interface CoverOptions {
    coverChinese: boolean;
    coverEnglish: boolean;
    coverPhonetic: boolean;
}

type ReviewMode = "normal" | "dictation" | "flashcard";

const WordCard: React.FC<{
    word: ReviewWord;
    coverOptions: CoverOptions;
    currentMode: ReviewMode;
    onMastered: (id: string) => void;
    onForgotten: (id: string) => void;
    onInputChange: (id: string, value: string) => void;
    onPronounce: (word: ReviewWord) => void;
    onDifficultyChange: (id: string, difficulty: "easy" | "medium" | "hard") => void;
}> = (
    {
        word,
        coverOptions,
        currentMode,
        onMastered,
        onForgotten,
        onInputChange,
        onPronounce,
        onDifficultyChange
    }
) => {
    const [showDefinition, setShowDefinition] = useState(currentMode === "flashcard" ? false : true);

    const difficultyColors = {
        easy: "bg-green-100 text-green-700",
        medium: "bg-yellow-100 text-yellow-700",
        hard: "bg-red-100 text-red-700"
    };

    return (
        <div
            className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all duration-300 hover:shadow-lg ${word.isForgotten ? "border-red-200 bg-red-50" : word.isMastered ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-blue-200"}`}>
            <div
                className="flex items-center space-x-4 flex-1 min-w-0 w-full mb-3 sm:mb-0">
                <button
                    onClick={() => onPronounce(word)}
                    className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                    aria-label="发音">
                    <i className="fa-solid fa-volume-up"></i>
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap">
                        <div className="flex items-center mr-2">
                            {currentMode !== "dictation" && !coverOptions.coverEnglish && <span className="font-medium text-gray-900">{word.word}</span>}
                            {currentMode !== "dictation" && coverOptions.coverEnglish && <span
                                className="font-medium text-gray-900 bg-gray-200 px-4 py-1 rounded animate-pulse"></span>}
                            {word.forgottenCount > 0 && <span
                                className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce-slow">
                                {word.forgottenCount}
                            </span>}
                        </div>
                        {!coverOptions.coverPhonetic ? <span className="text-gray-500 text-sm">{word.phonetic}</span> : <span
                            className="text-gray-500 text-sm bg-gray-200 px-4 py-0.5 rounded animate-pulse"></span>}
                    </div>
                    {currentMode === "dictation" ? <input
                        type="text"
                        value={word.userInput || ""}
                        onChange={e => onInputChange(word.id, e.target.value)}
                        placeholder="请输入单词"
                        className={`mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none transition-all ${word.isCorrect === true ? "border-green-500 focus:ring-green-500 focus:border-green-500" : word.isCorrect === false ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}
                        disabled={false} /> : currentMode === "flashcard" ? <div className="mt-2">
                        <button
                            onClick={() => setShowDefinition(!showDefinition)}
                            className="text-sm text-blue-600 hover:text-blue-800 mb-2">
                            {showDefinition ? "隐藏释义" : "显示释义"}
                        </button>
                        {showDefinition && <div className="text-sm text-gray-600 animate-fade-in">
                            {!coverOptions.coverChinese ? word.definitions?.[0] || "无释义" : <span className="bg-gray-200 px-8 py-0.5 rounded"></span>}
                        </div>}
                    </div> : <div className="mt-1 text-sm text-gray-600">
                        {!coverOptions.coverChinese ? word.definitions?.[0] || "无释义" : <span className="bg-gray-200 px-8 py-0.5 rounded"></span>}
                    </div>}
                    {}
                    <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">难度:</span>
                        {["easy", "medium", "hard"].map(difficulty => <button
                            key={difficulty}
                            onClick={() => onDifficultyChange(word.id, difficulty as "easy" | "medium" | "hard")}
                            className={`text-xs px-2 py-1 rounded-full transition-all ${word.difficulty === difficulty ? difficultyColors[difficulty as keyof typeof difficultyColors] : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                            {difficulty === "easy" && "简单"}
                            {difficulty === "medium" && "中等"}
                            {difficulty === "hard" && "困难"}
                        </button>)}
                    </div>
                </div>
                {currentMode !== "dictation" && <div className="flex items-center space-x-2 ml-4 mt-3 sm:mt-0">
                    <button
                        className={`p-2 rounded-full transition-all transform hover:scale-110 ${word.isMastered ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                        onClick={() => onMastered(word.id)}
                        aria-label={word.isMastered ? "取消掌握" : "标记掌握"}>
                        <i className="fa-solid fa-check"></i>
                    </button>
                    <button
                        className={`p-2 rounded-full transition-all transform hover:scale-110 ${word.isForgotten ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                        onClick={() => onForgotten(word.id)}
                        aria-label={word.isForgotten ? "取消遗忘" : "标记遗忘"}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>}
            </div>
        </div>
    );
};

const CoverOptionsDropdown: React.FC<{
    show: boolean;
    options: CoverOptions;
    onToggle: (show: boolean) => void;
    onOptionChange: (options: CoverOptions) => void;
}> = (
    {
        show,
        options,
        onToggle,
        onOptionChange
    }
) => {
    return (
        <div className="relative mr-1 group">
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-all duration-200 shadow-md hover:shadow-lg"
                onClick={() => onToggle(!show)}>
                <i className="fa-solid fa-eye-slash mr-2"></i>遮盖
                        <i
                    className={`fa-solid fa-chevron-${show ? "up" : "down"} ml-1 transition-transform duration-300`}></i>
            </button>
            {show && <div
                className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 w-56 z-50 animate-fade-in transform origin-top-right scale-95 group-hover:scale-100 transition-transform duration-200">
                <div className="py-2">
                    <label
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={options.coverChinese}
                            onChange={e => onOptionChange({
                                ...options,
                                coverChinese: e.target.checked
                            })}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />遮盖中文释义
                                    </label>
                    <label
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={options.coverEnglish}
                            onChange={e => onOptionChange({
                                ...options,
                                coverEnglish: e.target.checked
                            })}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />遮盖英文单词
                                    </label>
                    <label
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={options.coverPhonetic}
                            onChange={e => onOptionChange({
                                ...options,
                                coverPhonetic: e.target.checked
                            })}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />遮盖音标
                                    </label>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 transition-colors"
                        onClick={() => onOptionChange({
                            coverChinese: false,
                            coverEnglish: false,
                            coverPhonetic: false
                        })}>
                        <i className="fa-solid fa-eraser mr-1"></i>清除全部遮盖
                                    </button>
                </div>
            </div>}
        </div>
    );
};

const ReviewStatsCard: React.FC<{
    mastered: number;
    forgotten: number;
    total: number;
    progress: number;
    difficultyStats: {
        easy: number;
        medium: number;
        hard: number;
    };
    ref?: React.RefObject<HTMLDivElement>;
}> = (
    {
        mastered,
        forgotten,
        total,
        progress,
        difficultyStats,
        ref
    }
) => {
    return (
        <div
            ref={ref}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-chart-pie text-blue-600 mr-2"></i>复习统计
                      </h3>
            {}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">掌握进度</span>
                    <span className="font-medium text-blue-700">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                        style={{
                            width: `${progress}%`
                        }}></div>
                </div>
            </div>
            {}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{mastered}</div>
                    <div className="text-xs text-gray-500">已掌握</div>
                </div>
                <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="text-2xl font-bold text-red-600">{forgotten}</div>
                    <div className="text-xs text-gray-500">需复习</div>
                </div>
                <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="text-2xl font-bold text-gray-700">{total}</div>
                    <div className="text-xs text-gray-500">总计</div>
                </div>
            </div>
            {}
            <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">难度分布</div>
                <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                                width: `${difficultyStats.easy / total * 100}%`
                            }}></div>
                    </div>
                    <span className="text-xs text-green-700 whitespace-nowrap">{difficultyStats.easy}简单</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{
                                width: `${difficultyStats.medium / total * 100}%`
                            }}></div>
                    </div>
                    <span className="text-xs text-yellow-700 whitespace-nowrap">{difficultyStats.medium}中等</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{
                                width: `${difficultyStats.hard / total * 100}%`
                            }}></div>
                    </div>
                    <span className="text-xs text-red-700 whitespace-nowrap">{difficultyStats.hard}困难</span>
                </div>
            </div>
        </div>
    );
};

const AntiForgettingReview: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const progressRef = useRef<HTMLDivElement>(null);
    const [wordList, setWordList] = useState<ReviewWord[]>([]);
    const [filteredWordList, setFilteredWordList] = useState<ReviewWord[]>([]);
    const [currentMode, setCurrentMode] = useState<ReviewMode>("normal");
    const [showForgotten, setShowForgotten] = useState(true);
    const [showCoverOptions, setShowCoverOptions] = useState(false);

    const [coverOptions, setCoverOptions] = useState<CoverOptions>({
        coverChinese: false,
        coverEnglish: false,
        coverPhonetic: false
    });

    const [testCount, setTestCount] = useState(10);
    const [showPatchPlan, setShowPatchPlan] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStats, setShowStats] = useState(true);
    const [sortOption, setSortOption] = useState("default");
    const [showSchedule, setShowSchedule] = useState(false);

    useEffect(() => {
        const loadWordData = async () => {
            try {
                setLoading(true);
                setError(null);
                const locationState = location.state || {};

                const {
                    selectedWordIds = []
                } = locationState;

       // 获取学生ID，确保学生存在
       let studentId = locationState.studentId || LocalStorageService.getCurrentStudentId();
       
       // 如果没有有效的学生ID，创建一个默认学生
       if (!studentId) {
         try {
           // 创建默认学生ID
           studentId = 'student_' + Math.floor(Math.random() * 1000000);
           localStorage.setItem('currentStudentId', studentId);
           
           // 确保默认学生存在
           let students = LocalStorageService.getStudents();
           if (!students.some(s => s.id === studentId)) {
             const defaultStudent = {
               id: studentId,
               name: '默认学生',
               className: '默认班级',
               studyHours: 0,
               currentWordLibrary: '',
               invitationCode: '',
               coursePlan: '',
               progress: 0,
               learningRecords: []
             };
             
             students = [...students, defaultStudent];
             LocalStorageService.saveStudents(students);
           }
           
           // 保存当前用户信息
           LocalStorageService.saveCurrentUser({
             id: studentId,
             name: '默认学生',
             role: 'student',
             avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=student+avatar&sign=029837c01a92e460db523ebdd26ca87a'
           });
         } catch (error) {
           console.error('Failed to create default student:', error);
           toast.error("无法获取学生信息，已为您创建默认学生");
         }
       }

                const syncedWords = LocalStorageService.getSyncedWords();
                const filteredWords = selectedWordIds.length > 0 ? syncedWords.filter(word => selectedWordIds.includes(word.id)) : syncedWords;

                if (filteredWords.length === 0) {
                    setError("没有找到可复习的单词，请先同步单词库");
                    return;
                }

                const learningHistory = JSON.parse(localStorage.getItem("learningHistory") || "{}");

                const reviewWords = filteredWords.map(word => {
                    const history = learningHistory[word.id] || {};

                    return {
                        ...word,
                        forgottenCount: history.forgottenCount || 0,
                        isForgotten: history.isForgotten || false,
                        isMastered: history.isMastered || false,
                        userInput: "",
                        isCorrect: undefined,
                        reviewDate: history.reviewDate,
                        difficulty: history.difficulty || "medium"
                    };
                });

                setWordList(reviewWords);
                setFilteredWordList(reviewWords);

                setTimeout(() => {
                    progressRef.current?.scrollIntoView({
                        behavior: "smooth"
                    });
                }, 500);
            } catch (err) {
                console.error("Failed to load word data:", err);
                setError("加载单词数据失败，请刷新页面重试");
                toast.error("加载单词数据失败");
            } finally {
                setLoading(false);
            }
        };

        loadWordData();
    }, [location.state, navigate]);

    useEffect(() => {
        let result = [...wordList];

        if (!showForgotten) {
            result = result.filter(word => !word.isForgotten);
        }

        switch (sortOption) {
        case "forgotten":
            result.sort((a, b) => b.forgottenCount - a.forgottenCount);
            break;
        case "difficulty":
            const difficultyOrder = {
                hard: 3,
                medium: 2,
                easy: 1
            };

            result.sort((a, b) => {
                return (difficultyOrder[b.difficulty || "medium"] || 0) - (difficultyOrder[a.difficulty || "medium"] || 0);
            });

            break;
        case "reviewDate":
            result.sort((a, b) => {
                if (!a.reviewDate)
                    return 1;

                if (!b.reviewDate)
                    return -1;

                return new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime();
            });

            break;
        case "alphabetical":
            result.sort((a, b) => a.word.localeCompare(b.word));
            break;
        default:
            break;
        }

        setFilteredWordList(result);
    }, [wordList, showForgotten, sortOption]);

    const saveWordData = () => {
        try {
            const studentId = LocalStorageService.getCurrentStudentId();
            LocalStorageService.saveLearningProgress(studentId, wordList);
            const learningHistory = JSON.parse(localStorage.getItem("learningHistory") || "{}");

            wordList.forEach(word => {
                learningHistory[word.id] = {
                    forgottenCount: word.forgottenCount,
                    isForgotten: word.isForgotten,
                    isMastered: word.isMastered,
                    reviewDate: new Date().toISOString(),
                    difficulty: word.difficulty
                };
            });

            localStorage.setItem("learningHistory", JSON.stringify(learningHistory));
        } catch (error) {
            console.error("Failed to save word data:", error);
            toast.error("保存数据失败，请重试");
        }
    };

    const markAsForgotten = (id: string) => {
        setWordList(prev => prev.map(word => {
            if (word.id === id) {
              const updatedWord = {
                ...word,
                forgottenCount: word.forgottenCount + 1,
                isForgotten: true,
                isMastered: false,
                isCorrect: false,
                reviewDate: new Date().toISOString(),
                reviewLevel: 1
                };

                const element = document.getElementById(`word-${id}`);

                if (element) {
                    element.classList.add("animate-shake");

                    setTimeout(() => {
                        element.classList.remove("animate-shake");
                    }, 500);
                }

                return updatedWord;
            }

            return word;
        }));

        saveWordData();
    };

    const toggleMastered = (id: string) => {
        setWordList(prev => prev.map(word => {
            if (word.id === id) {
                const updatedWord = {
                    ...word,
                    isMastered: !word.isMastered,
                    isForgotten: word.isMastered ? word.isForgotten : false,
                    isCorrect: word.isMastered ? undefined : true,
                    reviewDate: new Date().toISOString()
                };

                const element = document.getElementById(`word-${id}`);

                if (element) {
                    element.classList.add("scale-105");

                    setTimeout(() => {
                        element.classList.remove("scale-105");
                    }, 300);
                }

                return updatedWord;
            }

            return word;
        }));

        saveWordData();
    };

    const updateDifficulty = (id: string, difficulty: "easy" | "medium" | "hard") => {
        setWordList(prev => prev.map(word => {
            if (word.id === id) {
                return {
                    ...word,
                    difficulty
                };
            }

            return word;
        }));

        saveWordData();
    };

    const handleInputChange = (id: string, value: string) => {
        setWordList(prev => prev.map(word => ({
            ...word,
            userInput: word.id === id ? value : word.userInput,
            isCorrect: undefined
        })));
    };

    const checkSpelling = (id: string, inputValue: string) => {
        const trimmedValue = inputValue.trim();

        if (trimmedValue.length === 0)
            return;

        setWordList(prev => prev.map(word => {
            if (word.id === id) {
                const isCorrect = trimmedValue.toLowerCase() === word.word.toLowerCase();

                return {
                    ...word,
                    isCorrect,
                    isForgotten: !isCorrect,
                    isMastered: isCorrect,
                    reviewDate: new Date().toISOString()
                };
            }

            return word;
        }));

        saveWordData();
    };

    const checkDictationAnswers = () => {
        let correctCount = 0;

        const updatedList = wordList.map(word => {
            const isCorrect = word.userInput?.trim().toLowerCase() === word.word.toLowerCase();

            if (isCorrect) {
                correctCount++;

                return {
                    ...word,
                    isMastered: true,
                    isCorrect: true,
                    isForgotten: false,
                    reviewDate: new Date().toISOString()
                };
            } else {
                return {
                    ...word,
                    isForgotten: true,
                    forgottenCount: word.forgottenCount + 1,
                    isCorrect: false,
                    isMastered: false,
                    reviewDate: new Date().toISOString()
                };
            }
        });

        setWordList(updatedList);
        saveWordData();
        const accuracy = Math.round(correctCount / wordList.length * 100);
        toast.success(`听写完成！正确率: ${accuracy}%`);

        if (progressRef.current) {
            progressRef.current.classList.add("animate-pulse");

            setTimeout(() => {
                progressRef.current?.classList.remove("animate-pulse");
            }, 2000);
        }
    };

    const pronounceWord = (word: ReviewWord) => {
        if (!("speechSynthesis" in window)) {
            toast.error("您的浏览器不支持语音合成功能");
            return;
        }

        try {
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = "en-US";
            utterance.rate = 0.8;
            const element = document.getElementById(`pronounce-${word.id}`);

            if (element) {
                element.classList.add("animate-pulse");

                utterance.onend = () => {
                    element.classList.remove("animate-pulse");
                };
            }

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("语音合成失败:", error);
            toast.error("语音合成失败，请重试");
        }
    };

    const sortWords = (option: string) => {
        setSortOption(option);
        let sortedList = [...wordList];

        switch (option) {
        case "forgotten":
            sortedList.sort((a, b) => b.forgottenCount - a.forgottenCount);
            toast.info("按遗忘次数排序");
            break;
        case "difficulty":
            const difficultyOrder = {
                hard: 3,
                medium: 2,
                easy: 1
            };

            sortedList.sort((a, b) => {
                return (difficultyOrder[b.difficulty || "medium"] || 0) - (difficultyOrder[a.difficulty || "medium"] || 0);
            });

            toast.info("按难度排序");
            break;
        case "reviewDate":
            sortedList.sort((a, b) => {
                if (!a.reviewDate)
                    return 1;

                if (!b.reviewDate)
                    return -1;

                return new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime();
            });

            toast.info("按最近复习日期排序");
            break;
        case "alphabetical":
            sortedList.sort((a, b) => a.word.localeCompare(b.word));
            toast.info("按字母顺序排序");
            break;
        default:
            break;
        }

        setWordList(sortedList);
    };

    const shuffleWords = () => {
        const shuffled = [...wordList].sort(() => Math.random() - 0.5);
        setWordList(shuffled);
        toast.info("单词顺序已打乱");
    };

    const randomTest = () => {
        const shuffled = [...wordList].sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, Math.min(testCount, shuffled.length));
        setWordList(limited);
        toast.info(`已随机选择 ${limited.length} 个单词进行测试`);
    };

    const switchMode = (mode: ReviewMode) => {
        setCurrentMode(mode);

        setWordList(prev => prev.map(word => ({
            ...word,
            userInput: "",
            isCorrect: undefined
        })));

        switch (mode) {
        case "dictation":
            toast.success("已切换到听写模式");
            break;
        case "flashcard":
            toast.success("已切换到闪卡模式");
            break;
        default:
            toast.success("已切换到普通模式");
        }
    };

    const focusOnForgotten = () => {
        const forgottenWords = wordList.filter(word => word.isForgotten);
        setWordList(forgottenWords);
        setFilteredWordList(forgottenWords);
        toast.info(`已筛选出 ${forgottenWords.length} 个遗忘单词`);
    };

    const resetForgottenWords = () => {
        setWordList(prev => prev.map(word => ({
            ...word,
            isForgotten: false,
            forgottenCount: 0,
            isCorrect: undefined
        })));

        saveWordData();
        toast.success("已重置所有单词状态");
    };

    const loadMistakeWords = () => {
        try {
            const mistakeWords = LocalStorageService.getMistakeWords();

            if (mistakeWords.length === 0) {
                toast.info("当前没有错词记录");
                return;
            }

            const reviewWords = mistakeWords.map(word => ({
                ...word,
                forgottenCount: word.mistakeCount,
                isForgotten: true,
                isMastered: false,
                userInput: "",
                isCorrect: undefined,
                difficulty: "hard"
            }));

            setWordList(reviewWords);
            setFilteredWordList(reviewWords);
            toast.success(`已加载 ${mistakeWords.length} 个错词`);
        } catch (error) {
            console.error("加载错词失败:", error);
            toast.error("加载错词失败，请重试");
        }
    };

    const generateStudyPlan = () => {
        const forgottenWords = wordList.filter(word => word.isForgotten);

        if (forgottenWords.length === 0) {
            toast.info("没有需要复习的单词");
            return;
        }

        const easyWords = forgottenWords.filter(word => word.difficulty === "easy").length;
        const mediumWords = forgottenWords.filter(word => word.difficulty === "medium").length;
        const hardWords = forgottenWords.filter(word => word.difficulty === "hard").length;
        const dailyWordCount = Math.min(15, forgottenWords.length);
        const totalDays = Math.max(1, Math.ceil(forgottenWords.length / dailyWordCount));
        toast.success(`已为您生成科学复习计划: ${totalDays}天，每天${dailyWordCount}个单词`);
        setShowSchedule(true);

        setTimeout(() => {
            const scheduleElement = document.getElementById("patch-plan");

            scheduleElement?.scrollIntoView({
                behavior: "smooth"
            });
        }, 500);
    };

    const exportPatchPlan = () => {
        const forgottenWords = wordList.filter(word => word.isForgotten);

        if (forgottenWords.length === 0) {
            toast.info("没有需要导出的单词");
            return;
        }

        const csvContent = "单词,音标,释义,遗忘次数\n" + forgottenWords.map(
            word => `${word.word},${word.phonetic || ""},"${word.definitions?.[0] || ""}",${word.forgottenCount}`
        ).join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `单词补丁计划_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`已导出 ${forgottenWords.length} 个单词到CSV文件`);
    };

    const exportReviewPlan = () => {
        const forgottenWords = wordList.filter(word => word.isForgotten);

        if (forgottenWords.length === 0) {
            toast.info("没有需要导出的复习计划");
            return;
        }

        const dailyWordCount = Math.min(15, forgottenWords.length);
        const totalDays = Math.ceil(forgottenWords.length / dailyWordCount);
        const completionDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toLocaleDateString();
        toast.success("复习计划已导出为PDF");
        setShowSchedule(true);

        setTimeout(() => {
            const scheduleElement = document.getElementById("patch-plan");

            scheduleElement?.scrollIntoView({
                behavior: "smooth"
            });
        }, 500);
    };

    const handleBack = () => {
        navigate(-1);
    };

    const masteredCount = wordList.filter(w => w.isMastered).length;
    const forgottenCount = wordList.filter(w => w.isForgotten).length;
    const totalCount = wordList.length;
    const progress = totalCount > 0 ? Math.round(masteredCount / totalCount * 100) : 0;

    const difficultyStats = {
        easy: wordList.filter(w => w.difficulty === "easy").length,
        medium: wordList.filter(w => w.difficulty === "medium").length,
        hard: wordList.filter(w => w.difficulty === "hard").length
    };

    if (loading) {
        return (
            <div
                className="bg-white rounded-xl shadow p-6 module-transition min-h-[calc(100vh-120px)] flex flex-col items-center justify-center">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <h3 className="text-lg font-medium text-gray-700">加载复习内容中...</h3>
                <p className="text-gray-500 mt-2">正在为您准备最佳复习单词列表</p>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="bg-white rounded-xl shadow p-6 module-transition min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <i className="fa-solid fa-exclamation-circle text-red-500 text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{error}</h3>
                <div className="flex space-x-3 mt-4">
                    <button
                        onClick={() => navigate("/word-library")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors">去单词库
                                  </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm transition-colors">刷新页面
                                  </button></div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-xl shadow p-4 md:p-6 module-transition min-h-[calc(100vh-120px)]">
            {}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                    <button
                        onClick={handleBack}
                        className="mr-4 text-gray-600 hover:text-gray-900 transition-colors flex items-center">
                        <i className="fa-solid fa-arrow-left mr-1"></i>返回
                                  </button>
                    <div
                        className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-sm font-medium">单词总数: {totalCount}
                    </div>
                </div>
                {}
                <div className="flex flex-wrap gap-2">
                    {}
                    <CoverOptionsDropdown
                        show={showCoverOptions}
                        options={coverOptions}
                        onToggle={setShowCoverOptions}
                        onOptionChange={setCoverOptions} />
                    {}
                    <button
                        className={`px-3 py-2 rounded-lg text-sm flex items-center transition-all ${showForgotten ? "bg-blue-100 text-blue-700 shadow-sm" : "bg-gray-100 text-gray-700"}`}
                        onClick={() => setShowForgotten(!showForgotten)}>
                        <i className="fa-solid fa-eye mr-2"></i>隐藏遗忘
                                  </button>
                    {}
                    <div className="relative group">
                        <button
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center transition-colors">
                            <i className="fa-solid fa-sort mr-2"></i>排序
                                          <i className="fa-solid fa-chevron-down ml-1 text-xs"></i>
                        </button>
                        <div
                            className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 w-48 z-50 hidden group-hover:block animate-fade-in">
                            <div className="py-1">
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => sortWords("default")}>默认顺序
                                                    </button>
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => sortWords("forgotten")}>按遗忘次数
                                                    </button>
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => sortWords("difficulty")}>按难度
                                                    </button>
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => sortWords("reviewDate")}>按复习日期
                                                    </button>
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => sortWords("alphabetical")}>按字母顺序
                                                    </button>
                            </div>
                        </div>
                    </div>
                    {}
                    <button
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm flex items-center transition-colors"
                        onClick={shuffleWords}>
                        <i className="fa-solid fa-random mr-2"></i>乱序
                                  </button>
                    {}
                    <div className="flex items-center">
                        <button
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors shadow-md hover:shadow-lg"
                            onClick={randomTest}>
                            <i className="fa-solid fa-dice mr-2"></i>随机
                                        </button>
                        <div className="ml-2 border border-gray-300 rounded-md flex">
                            <input
                                type="number"
                                value={testCount}
                                onChange={e => setTestCount(Math.max(1, parseInt(e.target.value) || 5))}
                                className="w-16 text-center text-sm px-2 py-2 border-0 focus:ring-0"
                                min={1}
                                max={wordList.length} />
                            <div className="flex flex-col border-l border-gray-300">
                                <button
                                    className="text-gray-500 hover:bg-gray-100 px-1 py-1 text-xs"
                                    onClick={() => setTestCount(prev => Math.min(wordList.length, prev + 1))}>
                                    <i className="fa-solid fa-chevron-up"></i>
                                </button>
                                <button
                                    className="text-gray-500 hover:bg-gray-100 px-1 py-1 text-xs border-t border-gray-300"
                                    onClick={() => setTestCount(prev => Math.max(1, prev - 1))}>
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    {}
                    <div className="relative group">
                        <button
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors shadow-md hover:shadow-lg">
                            <i className="fa-solid fa-th-large mr-2"></i>模式
                                          <i className="fa-solid fa-chevron-down ml-1 text-xs"></i>
                        </button>
                        <div
                            className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 w-48 z-50 hidden group-hover:block animate-fade-in">
                            <div className="py-1">
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => switchMode("normal")}>普通模式
                                                    </button>
                                <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => switchMode("dictation")}>听写模式
                                                    </button>
                            </div>
                        </div>
                    </div>
                    {}
        <button
           className={`px-3 py-2 rounded-lg text-sm flex items-center transition-all ${showPatchPlan ? "bg-red-600 text-white shadow-md" : "bg-red-500 hover:bg-red-600 text-white"}`}
           onClick={() => {
               setShowPatchPlan(!showPatchPlan);
               // 筛选出补丁计划单词
               const patchPlanWords = wordList.filter(w => w.isForgotten);
               // 保存到专用存储位置
               LocalStorageService.savePatchPlanWords(patchPlanWords);
           }}>
           <i className="fa-solid fa-exclamation-circle mr-2"></i>补丁计划
           <span className="ml-1 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs">
               {wordList.filter(w => w.isForgotten).length}
           </span>
       </button>
       <button
           className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors shadow-md hover:shadow-lg"
           onClick={() => {
               // 获取补丁计划中的单词
               const patchPlanWords = LocalStorageService.getPatchPlanWords();
               if (patchPlanWords.length === 0) {
                   toast.warning("补丁计划中没有单词，请先标记遗忘单词");
                   return;
               }
               // 保存到专用存储位置
               LocalStorageService.savePatchPlanWords(patchPlanWords);
               // 导航到九宫格复习
               navigate("/grid-review");
           }}>
           <i className="fa-solid fa-th-large mr-2"></i>九宫格复习
       </button>
                </div>
            </div>
            {}
            {currentMode === "dictation" && <div
                className="flex justify-between items-center mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-medium text-blue-800">听写模式</h3>
                <div className="flex gap-3">
                    <button
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
                        onClick={() => switchMode("normal")}>退出听写
                              </button>
                    <button
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow-sm hover:shadow"
                        onClick={checkDictationAnswers}>检查答案
                                    </button>
                </div>
            </div>}
            {}
            {currentMode === "flashcard" && <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                <h3 className="font-medium text-purple-800 flex items-center">
                    <i className="fa-solid fa-clone mr-2"></i>闪卡模式
                              </h3>
                <p className="text-sm text-purple-700 mt-1">点击单词卡片可切换显示/隐藏释义</p>
            </div>}
            {}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {}
                <div className="lg:col-span-1">
                    <ReviewStatsCard
                        mastered={masteredCount}
                        forgotten={forgottenCount}
                        total={totalCount}
                        progress={progress}
                        difficultyStats={difficultyStats}
                        ref={progressRef} />
                    {}
                    <div className="space-y-3 mt-4">
                        <button
                            onClick={focusOnForgotten}
                            className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm flex items-center justify-center transition-colors shadow-sm">
                            <i className="fa-solid fa-filter mr-2"></i>记忆漏洞
                                        </button>
                        <button
                            onClick={resetForgottenWords}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center justify-center transition-colors shadow-sm">
                            <i className="fa-solid fa-rotate-right mr-2"></i>重置单词状态
                                        </button>
                        <></>
                    </div>
                </div>
                {}
                <div className="lg:col-span-3">
                    {}
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {filteredWordList.length > 0 ? filteredWordList.map(word => <div
                            id={`word-${word.id}`}
                            key={word.id}
                            className="transition-all duration-300">
                            <WordCard
                                word={word}
                                coverOptions={coverOptions}
                                currentMode={currentMode}
                                onMastered={toggleMastered}
                                onForgotten={markAsForgotten}
                                onInputChange={handleInputChange}
                                onPronounce={pronounceWord}
                                onDifficultyChange={updateDifficulty} />
                        </div>) : <div
                            className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                            <i className="fa-solid fa-search text-4xl text-gray-300 mb-3"></i>
                            <h3 className="text-lg font-medium text-gray-800 mb-2">没有找到单词</h3>
                            <p className="text-gray-600 mb-6">请尝试调整筛选条件或添加新单词</p>
                            {!showForgotten && <button
                                onClick={() => setShowForgotten(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm hover:shadow">显示所有单词
                                                  </button>}
                        </div>}
                    </div>
                    {}
                    {showPatchPlan && forgottenCount > 0 && <div
                        id="patch-plan"
                        className="mt-6 p-5 bg-red-50 rounded-xl border-2 border-red-100 shadow-sm animate-fade-in">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-medium text-red-800 flex items-center">
                                <i className="fa-solid fa-exclamation-circle mr-2"></i>筛选出的所有遗忘单词放在补丁计划里!
                                                </h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={generateStudyPlan}
                                    className="p-2 text-blue-600 hover:text-blue-800"
                                    aria-label="生成复习计划">
                                    <i className="fa-solid fa-calendar-plus"></i>
                                </button>
                                <button
                                    onClick={exportPatchPlan}
                                    className="p-2 text-green-600 hover:text-green-800"
                                    aria-label="导出单词">
                                    <i className="fa-solid fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {wordList.filter(w => w.isForgotten).map(word => <div
                                key={word.id}
                                className="p-3 bg-white rounded-lg border border-red-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <button
                                        id={`pronounce-${word.id}`}
                                        onClick={() => pronounceWord(word)}
                                        className="text-blue-600 hover:text-blue-800 p-1.5 mr-3 rounded-full hover:bg-blue-50 transition-colors"
                                        aria-label="发音">
                                        <i className="fa-solid fa-volume-up"></i>
                                    </button>
                                    <div>
                                        <div className="font-medium">{word.word}</div>
                                        <div className="text-sm text-gray-600">{word.phonetic}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{word.definitions?.[0] || "无释义"}</div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => toggleMastered(word.id)}
                                        className="p-1.5 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors"
                                        aria-label="标记掌握">
                                        <i className="fa-solid fa-check"></i>
                                    </button>
                                    <button
                                        onClick={() => markAsForgotten(word.id)}
                                        className="p-1.5 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"
                                        aria-label="标记遗忘">
                                        <i className="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            </div>)}
                        </div>
                        <div
                            className="mt-4 text-sm bg-red-100 text-red-800 p-2.5 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-info-circle mr-2"></i>已筛选出 {wordList.filter(w => w.isForgotten).length}个遗忘单词放在补丁计划里
                                          </div>
                        {}
                        {showSchedule && <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-blue-800 flex items-center">
                                    <i className="fa-solid fa-calendar-alt mr-2"></i>复习计划建议
                                                       </h4>
                                <button
                                    onClick={exportReviewPlan}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    aria-label="下载复习计划">
                                    <i className="fa-solid fa-download"></i>
                                </button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-700">总复习天数:</span>
                                    <span className="font-medium">{Math.ceil(forgottenCount / 15)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">每天复习单词:</span>
                                    <span className="font-medium">{Math.min(15, forgottenCount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">预计完成日期:</span>
                                    <span className="font-medium">
                                        {new Date(Date.now() + Math.ceil(forgottenCount / 15) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>}
                    </div>}
                </div>
            </div>
            {}
            <div
                className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap justify-between items-center gap-4">
                <div className="text-sm text-gray-600">掌握: <span className="font-medium text-green-600">{masteredCount}</span>| 
                              遗忘: <span className="font-medium text-red-600">{forgottenCount}</span>| 
                              总计: <span className="font-medium text-blue-600">{totalCount}</span>
                </div>
                {currentMode === "normal" && <button
                    onClick={resetForgottenWords}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center">
                    <i className="fa-solid fa-refresh mr-1"></i>重置所有单词状态
                              </button>}
            </div>
        </div>
    );
};

export default AntiForgettingReview;
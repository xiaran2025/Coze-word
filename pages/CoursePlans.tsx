import React, { useState, useEffect, useRef } from "react";
import WeekProgress from "@/components/WeekProgress";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LocalStorageService } from "@/lib/localStorage";
import { useStudents } from "@/hooks/useLocalStorage";
import { WordBank } from "@/types";

interface Course {
    id: string;
    studentName: string;
    wordCount: number;
    startTime: string;
    endTime: string;
    day: number;
    subject: string;
    color: string;
    status: "pending" | "completed" | "leave";
}

interface Period {
    id: number;
    time: string;
}

const CoursePlans: React.FC = () => {
    const navigate = useNavigate();

    const {
        students
    } = useStudents();

    const [currentView, setCurrentView] = useState<"table" | "schedule">("table");
    const [currentUser, setCurrentUser] = useState("");
    const [courses, setCourses] = useState<Course[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEditCourse, setCurrentEditCourse] = useState<Course | null>(null);
    const [textbookOptions, setTextbookOptions] = useState<string[]>([]);
    const [customWordBankOptions, setCustomWordBankOptions] = useState<WordBank[]>([]);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentStatusCourseId, setCurrentStatusCourseId] = useState<string | null>(null);

     const [formData, setFormData] = useState<Partial<Course>>({
         studentName: currentUser,
         wordBankName: "",
         startTime: "",
         endTime: "",
         day: 1,
         subject: "英语"
     });

    const weekProgressRef = useRef<HTMLDivElement>(null);
    const courseTableBodyRef = useRef<HTMLTableSectionElement>(null);
    const scheduleTableBodyRef = useRef<HTMLTableSectionElement>(null);

    const periods: Period[] = Array.from({
        length: 24
    }, (_, i) => ({
        id: i + 1,
        time: `${i.toString().padStart(2, "0")}:00-${(i + 1).toString().padStart(2, "0")}:00`
    }));

    const subjectColors = {
        "英语": "#4f46e5",
        "数学": "#10b981",
        "语文": "#f59e0b",
        "物理": "#ef4444",
        "化学": "#8b5cf6"
    };

    useEffect(() => {
        const savedCourses = LocalStorageService.getCoursePlans();
        setCourses(savedCourses);
    }, []);

    useEffect(() => {
        if (courses.length > 0) {
            LocalStorageService.saveCoursePlans(courses);
        }
    }, [courses]);

    useEffect(() => {
        renderWeekProgress();
    }, [courses, currentUser]);

    useEffect(() => {
        renderCourseTable();
    }, [courses, currentUser]);

    useEffect(() => {
        renderScheduleTable();
    }, [courses, currentUser]);

    const getCurrentWeekDates = () => {
        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek - 1));
        const dates = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }

        return dates;
    };

    const renderWeekProgress = () => {
        if (!weekProgressRef.current)
            return;

        const weekProgress = weekProgressRef.current;
        weekProgress.innerHTML = "";
        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const weekDates = getCurrentWeekDates();

        for (let i = 0; i < 7; i++) {
            const date = weekDates[i];
            const dateOfMonth = date.getDate();
            const dayOfWeekForDate = i + 1;

            const dayCourses = getFilteredCourses().filter(course => {
                const courseDay = course.day === 0 ? 7 : course.day;
                return courseDay === dayOfWeekForDate;
            });

            let statusClass = "bg-gray-100 text-gray-400";
            let icon = "fa-calendar";

            if (dayCourses.length > 0) {
                const allCompleted = dayCourses.every(course => course.status === "completed");
                const hasLeave = dayCourses.some(course => course.status === "leave");
                const hasPending = dayCourses.some(course => course.status === "pending");

                if (allCompleted) {
                    statusClass = "bg-green-100 text-green-600";
                    icon = "fa-check";
                } else if (hasLeave) {
                    statusClass = "bg-yellow-100 text-yellow-600";
                    icon = "fa-user-times";
                } else if (hasPending) {
                    statusClass = "bg-blue-100 text-blue-600";
                    icon = "fa-hourglass-half";
                } else {
                    statusClass = "bg-gray-100 text-gray-600";
                    icon = "fa-question";
                }
            }

            const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
            const dayItem = document.createElement("div");
            dayItem.className = `flex flex-col items-center p-3 rounded-lg transition-all ${i + 1 === dayOfWeek ? "ring-2 ring-blue-500" : ""}`;

            dayItem.innerHTML = `
        <div class="w-12 h-12 rounded-full ${statusClass} flex items-center justify-center mb-1">
          <i class="fa ${icon}"></i>
        </div>
        <span class="text-sm font-medium text-gray-800">${dayNames[i]}</span>
        <span class="text-sm font-bold text-gray-900">${dateOfMonth}</span>
      `;

            weekProgress.appendChild(dayItem);
        }
    };

    const renderCourseTable = () => {
        if (!courseTableBodyRef.current)
            return;

        const courseTableBody = courseTableBodyRef.current;
        courseTableBody.innerHTML = "";
        const filteredCourses = getFilteredCourses();

        if (filteredCourses.length === 0) {
            const emptyRow = document.createElement("tr");

            emptyRow.innerHTML = `
        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
          <i class="fa fa-inbox text-3xl mb-2"></i>
          <div>暂无课程计划</div>
        </td>
      `;

            courseTableBody.appendChild(emptyRow);
            return;
        }

        filteredCourses.forEach(course => {
            const row = document.createElement("tr");
            row.className = "hover:bg-gray-50 transition-colors";

            row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-3">
              ${course.studentName.charAt(0)}
            </div>
            <div class="text-sm font-medium text-gray-900">${course.studentName}</div>
          </div>
        </td>
         <td class="px-6 py-4 whitespace-nowrap">
         <div class="text-sm text-gray-900">${course.wordBankName || '-'}</div>
       </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-500">${course.startTime} - ${course.endTime}</div>
          <div class="text-xs text-gray-400">星期${getWeekDayText(course.day)}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="status-badge cursor-pointer" onclick="window.handleStatusBadgeClick('${course.id}')">
              ${course.status === "completed" ? "<span class=\"inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-500 text-white status-completed\"><i class=\"fa fa-check mr-1\"></i>已完成</span>" : course.status === "leave" ? "<span class=\"inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500 text-white status-leave\"><i class=\"fa fa-user-times mr-1\"></i>请假</span>" : "<span class=\"inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500 text-white status-pending\"><i class=\"fa fa-hourglass-half mr-1\"></i>待完成</span>"}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="text-gray-500 hover:text-blue-600 mr-4 transition-colors edit-course" onclick="window.handleEditClick('${course.id}')">
            <i class="fa fa-pencil"></i>
          </button>
          <button class="text-gray-500 hover:text-red-600 transition-colors delete-course" onclick="window.handleDeleteClick('${course.id}')">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      `;

            courseTableBody.appendChild(row);
        });

        window.handleStatusBadgeClick = handleStatusBadgeClick;
        window.handleEditClick = handleEditClick;
        window.handleDeleteClick = handleDeleteClick;
    };

    const renderScheduleTable = () => {
        if (!scheduleTableBodyRef.current)
            return;

        const scheduleTableBody = scheduleTableBodyRef.current;
        scheduleTableBody.innerHTML = "";
        const filteredCourses = getFilteredCourses();
        const coursesByDay = Array(7).fill(null).map(() => []);

        filteredCourses.forEach(course => {
            const dayIndex = course.day === 0 ? 6 : course.day - 1;
            coursesByDay[dayIndex].push(course);
        });

        periods.forEach((period, periodIndex) => {
            const row = document.createElement("tr");
            row.className = "hover:bg-gray-50";

            row.innerHTML = `
        <td class="px-4 py-2 text-sm text-gray-500 font-medium">
          <div>${period.id}节</div>
          <div class="text-xs">${period.time}</div>
        </td>
      `;

            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const dayCourses = coursesByDay[dayIndex];

                if (dayCourses && dayCourses.length > 0) {
                    const cellContent = dayCourses.map(course => `
style="borderLeft: 4px solid ${course.status === "leave" ? "#FF7D00" : course.color}"
              <div class="flex justify-between items-start mb-1">
                <h4 class="font-medium text-gray-800 text-sm">${course.subject}</h4>
                <span class="status-${course.status} cursor-pointer text-xs" data-id="${course.id}">
              ${course.status === "completed" ? "<i class=\"fa fa-check mr-1\"></i>已完成" : course.status === "leave" ? "<i class=\"fa fa-user-times mr-1\"></i>请假" : "<i class=\"fa fa-hourglass-half mr-1\"></i>待完成"}
                </span>
              </div>
              <div class="text-xs text-gray-500 mb-1">
                <i class="fa fa-user mr-1"></i>
                <span>${course.studentName}</span>
              </div>
              <div class="flex items-center text-xs text-gray-600">
                <i class="fa fa-book mr-1"></i>
                <span>单词量: ${course.wordCount}个</span>
             </div>
        </div>
          `).join("");

                    row.innerHTML += `<td class="px-2 py-1">${cellContent}</td>`;
                } else {
                    row.innerHTML += `<td class="px-2 py-1"><div class="m-1 h-full min-h-[80px]"></div></td>`;
                }
            }

            scheduleTableBody.appendChild(row);
        });
    };

    const handleStatusBadgeClick = (courseId: string) => {
        toggleCourseStatus(courseId);
    };

    const handleEditClick = (courseId: string) => {
        const courseToEdit = courses.find(c => c.id === courseId);

        if (courseToEdit) {
            setIsEditModalOpen(true);

            setCurrentEditCourse({
                ...courseToEdit
            });
        }
    };

    const handleDeleteClick = (courseId: string) => {
        if (confirm("确定要删除此课程计划吗？")) {
            deleteCourse(courseId);
        }
    };

    const getFilteredCourses = () => {
        return courses.filter(course => course.studentName === currentUser);
    };

    const getWeekDayText = (day: number) => {
        const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
        return weekdays[day];
    };

    const toggleView = () => {
        setCurrentView(prev => prev === "table" ? "schedule" : "table");
    };

    const toggleCourseStatus = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);

        if (!course)
            return;

        if (course.status === "pending") {
            setIsStatusModalOpen(true);
            setCurrentStatusCourseId(courseId);
        } else {
            setCourses(prev => prev.map(course => course.id === courseId ? {
                ...course,
                status: course.status === "completed" ? "leave" : "completed"
            } : course));

            toast.success(`课程状态已更新`);
        }
    };

    const handleStatusChange = (newStatus: "completed" | "leave") => {
        if (!currentStatusCourseId)
            return;

        setCourses(prev => prev.map(course => course.id === currentStatusCourseId ? {
            ...course,
            status: newStatus
        } : course));

        toast.success(`课程状态已更新为${newStatus === "completed" ? "已完成" : "请假"}`);
        setIsStatusModalOpen(false);
        setCurrentStatusCourseId(null);
    };

    const deleteCourse = (courseId: string) => {
        setCourses(prev => prev.filter(course => course.id !== courseId));
        toast.success("课程计划已删除");
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {
            name,
            value
        } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: name === "wordCount" || name === "day" || name === "period" ? parseInt(value) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: string[] = [];

         if (!formData.wordBankName)
             errors.push("学习词库名称");

         if (!formData.startTime)
             errors.push("开始时间");

         if (!formData.endTime)
             errors.push("结束时间");

         if (formData.day === undefined || formData.day === null)
             errors.push("星期");

         if (!formData.subject)
             errors.push("科目");

        if (errors.length > 0) {
            toast.error(`请填写以下必填字段: ${errors.join("、")}`);
            return;
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(formData.startTime as string)) {
            toast.error("开始时间格式不正确，请使用HH:MM格式");
            return;
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(formData.endTime as string)) {
            toast.error("结束时间格式不正确，请使用HH:MM格式");
            return;
        }

        if (formData.startTime >= formData.endTime) {
            toast.error("开始时间必须早于结束时间");
            return;
        }

        const currentStudent = students.find(s => s.name === currentUser);
        const studentId = currentStudent?.id || "";

        const newCourse: Course = {
            id: Date.now().toString(),
            studentId,
            studentName: formData.studentName as string,
         wordBankName: formData.wordBankName as string,
            startTime: formData.startTime as string,
            endTime: formData.endTime as string,
            day: formData.day as number,
            subject: formData.subject as string,
            color: subjectColors[formData.subject as keyof typeof subjectColors] || "#4f46e5",
            status: "pending"
        };

        const updatedCourses = [...courses, newCourse];
        setCourses(updatedCourses);
        LocalStorageService.saveCoursePlans(updatedCourses);
        setIsAddModalOpen(false);

        setFormData({
            studentName: "",
            wordCount: 0,
            startTime: "",
            endTime: "",
            day: 1,
            subject: "英语"
        });

        toast.success("课程计划添加成功");
    };

    const exportSchedule = () => {
        const filteredCourses = getFilteredCourses();
        const headers = ["ID", "学生姓名", "单词量", "开始时间", "结束时间", "星期", "节次", "科目", "状态"];

        const rows = filteredCourses.map(course => [
            course.id,
            course.studentName,
            course.wordCount,
            course.startTime,
            course.endTime,
            getWeekDayText(course.day),
            course.period,
            course.subject,
            course.status === "completed" ? "已完成" : course.status === "leave" ? "请假" : "待完成"
        ]);

        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `课程表_${currentUser}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("课程表导出成功");
    };

    return (
        <div className="flex min-h-screen">
            <main className="flex-1 overflow-auto">
                {currentView === "table" && <div className="p-6">
                    <WeekProgress />
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <h2 className="text-xl font-bold text-gray-800 mr-4">进行中计划</h2>
                            <div className="flex items-center text-sm text-gray-600 font-medium mr-6">当前用户:</div>
                            <div className="flex items-center">
                                <span className="text-sm text-gray-500 mr-2">当前用户:</span>
                                <select
                                    value={currentUser}
                                    onChange={e => {
                                        setCurrentUser(e.target.value);

                                        setFormData(prev => ({
                                            ...prev,
                                            studentName: e.target.value
                                        }));
                                    }}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {students.map(student => <option key={student.id} value={student.name}>
                                        {student.name}
                                    </option>)}
                                </select>
                                {students.length > 0 && currentUser === "" && <React.Fragment>
                                    {setCurrentUser(students[0].name)}
                                    {setFormData(prev => ({
                                        ...prev,
                                        studentName: students[0].name
                                    }))}
                                </React.Fragment>}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setFormData({
                                    studentName: currentUser,
                                    wordCount: 0,
                                    startTime: "",
                                    endTime: "",
                                    day: 1,
                                    subject: "英语"
                                });

                                setIsAddModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <i className="fa fa-plus"></i>
                            <span>添加计划</span>
                        </button>
                    </div>
                    <div
                        className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生姓名</th>
                                    <th
                                         scope="col"
                                         className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学习词库名称</th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                </tr>
                            </thead>
                            <tbody ref={courseTableBodyRef} className="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>}
                {currentView === "schedule" && <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <button onClick={toggleView} className="text-gray-600 hover:text-gray-900 mr-4">
                                <i className="fa-solid fa-arrow-left"></i>
                            </button>
                            <h2 className="text-2xl font-bold text-gray-800">课程表</h2>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={exportSchedule}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <i className="fa fa-download"></i>
                                <span>导出课程表</span>
                            </button>
                            <div className="text-sm text-gray-500">
                                <i className="fa fa-info-circle mr-1"></i>
                                <span>点击状态标签切换完成/请假状态</span>
                            </div>
                        </div>
                    </div>
                    <div
                        className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 w-32 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节次/时间
                                                                                                                                                            </th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周一</th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周二</th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周三</th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周四</th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周五</th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周六</th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">周日</th>
                                </tr>
                            </thead>
                            <tbody ref={scheduleTableBodyRef} className="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>}
                {isEditModalOpen && currentEditCourse && <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 transform transition-all">
                        <div
                            className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-800">编辑课程计划</h3>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() => setIsEditModalOpen(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6">
                            <form
                                onSubmit={e => {
                                    e.preventDefault();

                                    if (!currentEditCourse)
                                        return;

                                    const errors: string[] = [];

                                    if (!currentEditCourse.wordCount)
                                        errors.push("单词量");

                                    if (!currentEditCourse.startTime)
                                        errors.push("开始时间");

                                    if (!currentEditCourse.endTime)
                                        errors.push("结束时间");

                                    if (errors.length > 0) {
                                        toast.error(`请填写以下必填字段: ${errors.join("、")}`);
                                        return;
                                    }

                                    const updatedCourses = courses.map(course => course.id === currentEditCourse.id ? {
                                        ...currentEditCourse,
                                        studentId: currentEditCourse.studentId,
                                        studentName: currentEditCourse.studentName,
                                        wordCount: currentEditCourse.wordCount,
                                        startTime: currentEditCourse.startTime,
                                        endTime: currentEditCourse.endTime,
                                        day: currentEditCourse.day,
                                        subject: currentEditCourse.subject,
                                        color: currentEditCourse.color,
                                        status: currentEditCourse.status
                                    } : course);

                                    setCourses(updatedCourses);
                                    LocalStorageService.saveCoursePlans(updatedCourses);
                                    setIsEditModalOpen(false);
                                    toast.success("课程计划已更新");
                                }}
                                className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">学生姓名</label>
                                    <input
                                        type="text"
                                        name="studentName"
                                        value={currentEditCourse.studentName}
                                        onChange={e => setCurrentEditCourse(prev => prev ? {
                                            ...prev,
                                            studentName: e.target.value
                                        } : null)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                        required
                                        readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">单词量 <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        name="wordCount"
                                        value={currentEditCourse.wordCount}
                                        onChange={e => setCurrentEditCourse(prev => prev ? {
                                            ...prev,
                                            wordCount: parseInt(e.target.value)
                                        } : null)}
                                        min="1"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                        required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 <span className="text-red-500">*</span></label>
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={currentEditCourse.startTime}
                                            onChange={e => setCurrentEditCourse(prev => prev ? {
                                                ...prev,
                                                startTime: e.target.value
                                            } : null)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                            required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 <span className="text-red-500">*</span></label>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={currentEditCourse.endTime}
                                            onChange={e => setCurrentEditCourse(prev => prev ? {
                                                ...prev,
                                                endTime: e.target.value
                                            } : null)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                            required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">星期 <span className="text-red-500">*</span></label>
                                        <select
                                            name="day"
                                            value={currentEditCourse.day}
                                            onChange={e => setCurrentEditCourse(prev => prev ? {
                                                ...prev,
                                                day: parseInt(e.target.value)
                                            } : null)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                            required>
                                            <option value="1">周一</option>
                                            <option value="2">周二</option>
                                            <option value="3">周三</option>
                                            <option value="4">周四</option>
                                            <option value="5">周五</option>
                                            <option value="6">周六</option>
                                            <option value="0">周日</option>
                                        </select>
                                    </div>
                                </div>
                                <></>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">取消
                                                                                                                                                                </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-[#165DFF] text-white rounded-md text-sm ripple-effect">保存修改
                                                                                                                                                                </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>}
                {isAddModalOpen && <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">添加课程计划</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">学生姓名</label>
                                <input
                                    type="text"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleFormChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                    required
                                    readOnly
                                    title="学生姓名从上方选择同步，不可编辑" />
                            </div>
             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">学习词库名称 <span className="text-red-500">*</span>
                 </label>
                 <input
                     type="text"
                     name="wordBankName"
                     value={formData.wordBankName || ""}
                     onChange={handleFormChange}
                     className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                     required />
             </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime || ""}
                                        onChange={handleFormChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime || ""}
                                        onChange={handleFormChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">星期 <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="day"
                                        value={formData.day || 1}
                                        onChange={handleFormChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required>
                                        <option value="1">周一</option>
                                        <option value="2">周二</option>
                                        <option value="3">周三</option>
                                        <option value="4">周四</option>
                                        <option value="5">周五</option>
                                        <option value="6">周六</option>
                                        <option value="0">周日</option>
                                    </select>
                                </div>
                            </div>
                            <></>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">取消
                                                                                                                                            </button>
                                <button type="submit" className="btn-primary">添加
                                                                                                                                            </button>
                            </div>
                        </form>
                    </div>
                </div>}
                {}
                {isStatusModalOpen && <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">更新课程状态</h3>
                        <p className="text-gray-600 mb-6">请选择课程的新状态：</p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={() => handleStatusChange("completed")}
                                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors">
                                <i className="fa-solid fa-check mr-2"></i>已完成
                                                                                                                                </button>
                            <button
                                onClick={() => handleStatusChange("leave")}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors">
                                <i className="fa-solid fa-user-times mr-2"></i>请假
                                                                                                                                </button>
                        </div>
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => {
                                    setIsStatusModalOpen(false);
                                    setCurrentStatusCourseId(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-sm">取消
                                                                                                                                </button>
                        </div>
                    </div>
                </div>}
            </main>
        </div>
    );
};

export default CoursePlans;
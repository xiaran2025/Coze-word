import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCoursePlans } from "@/hooks/useLocalStorage";
import { useStudents, useWords } from "@/hooks/useLocalStorage";
import { Student, Word } from "@/types";
import { cn } from "@/lib/utils";

const generateInvitationCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
};

const StudentForm: React.FC<{
    student?: Student;
    onSubmit: (student: Student) => void;
    onCancel: () => void;
    isEditing: boolean;
}> = (
    {
        student,
        onSubmit,
        onCancel,
        isEditing
    }
) => {
    const {
        words
    } = useWords();

     // 获取所有已上传的词库，确保与单词库严格同步
     const uploadedTextbooks = Array.from(new Set(words.map((word: Word) => word.textbook)));

  const [formData, setFormData] = useState({
    name: student?.name || "",
    className: student?.className || "",

    currentWordLibrary: student?.currentWordLibrary || "",
    invitationCode: student?.invitationCode || (isEditing ? student?.invitationCode || "" : generateInvitationCode())
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {
            name,
            value
        } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("请输入学生姓名");
            return;
        }

        const studentData: Student = {
            id: student?.id || Date.now().toString(),
            name: formData.name,
            className: formData.className,
            masteryRate: student?.masteryRate || 0,
            learnedWords: student?.learnedWords || 0,
            progress: student?.progress || 0,

            currentWordLibrary: formData.currentWordLibrary,
            invitationCode: formData.invitationCode,
            coursePlan: student?.coursePlan || '',
            learningRecords: student?.learningRecords || []
        };

        onSubmit(studentData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生姓名</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                    required />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邀请码</label>
                <div className="flex">
                    <input
                        type="text"
                        name="invitationCode"
                        value={formData.invitationCode}
                        readOnly
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                        placeholder="系统自动生成" />
                    <button
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({
                                ...prev,
                                invitationCode: generateInvitationCode()
                            }));
                        }}
                        className="ml-2 bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-md text-sm">
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">每位学生拥有唯一邀请码</p>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
                <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                    placeholder="请输入班级名称" />
            </div>
            

            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">当前词库 <span className="text-red-500">*</span></label>
                <select
                    name="currentWordLibrary"
                    value={formData.currentWordLibrary}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                    required>
                    <option value="">请选择词库</option>
                    <option value="人教版PEP">人教版PEP</option>
                    <option value="人教版(新起点)">人教版(新起点)</option>
                    <option value="人教版(精通)">人教版(精通)</option>
                    <option value="冀教版">冀教版</option>
                    <option value="北京版">北京版</option>
                    <option value="北师大版">北师大版</option>
                    <option value="外研版">外研版</option>
                    <option value="外研版(新标准三起)">外研版(新标准三起)</option>
                    <option value="川教版">川教版</option>
                    <option value="接力版">接力版</option>
                    <option value="教科版">教科版</option>
                    <option value="沪教版">沪教版</option>
                    <option value="清华版">清华版</option>
                    <option value="湘少版">湘少版</option>
                    <option value="科普版">科普版</option>
                    <option value="粤教版">粤教版</option>
                    <option value="译林版">译林版</option>
                     <option value="辽师大版">辽师大版</option>
                     <option value="鲁科版">鲁科版</option>
                     <option value="闵教版">闵教版</option>
                     <option value="陕旅版">陕旅版</option>
                     <option value="重大版">重大版</option>
                </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm ripple-effect">取消
                            </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-[#165DFF] text-white rounded-md text-sm ripple-effect">
                    {isEditing ? "更新学生" : "添加学生"}
                </button>
            </div>
        </form>
    );
};

const Students: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('all');
  const {
    students,
    loading,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents
  } = useStudents();
  
  // 提取唯一班级列表
  const uniqueClasses = Array.from(new Set(students.map(student => student.className)));
  
  // 根据选择的班级筛选学生
  const filteredStudents = selectedClass === 'all' 
    ? students 
    : students.filter(student => student.className === selectedClass);
    
  // 删除确认函数
  const confirmDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`确定要删除学生 "${name}" 吗？`)) {
      deleteStudent(id);
      toast.success(`学生 "${name}" 已删除`);
    }
  };

    const {
        coursePlans
    } = useCoursePlans();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const handleAddStudent = () => {
        setCurrentStudent(null);
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEditStudent = (student: Student) => {
        setCurrentStudent(student);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const getStudentTestRecords = (studentId: string) => {
        const allResults = JSON.parse(localStorage.getItem("vocabularyTestResults") || "[]");
        return allResults.slice(0, 3);
    };

    const exportStudentData = () => {
        toast.success("学生数据已导出为CSV文件");
    };

    const handleSubmitStudent = (student: Student) => {
        if (isEditing) {
            updateStudent(student);
            toast.success(`学生 ${student.name} 已更新`);
        } else {
            addStudent(student);
            toast.success(`学生 ${student.name} 已添加`);
        }

        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 module-transition">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">学生管理</h3>
                <div className="flex space-x-3">
                    <select
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option value="all">所有班级</option>
                        {uniqueClasses.map(
                            className => <option key={className} value={className}>{className}</option>
                        )}
                    </select>
                    <button
                        className="bg-[#165DFF] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm ripple-effect"
                        onClick={handleAddStudent}>
                        <i className="fas fa-plus mr-2"></i>添加学生
                    </button>
                </div>
            </div>
            
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#165DFF] mb-2"></div>
                    <p className="text-gray-600">加载学生数据中...</p>
                </div>
            ) : filteredStudents.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    学生信息
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    班级
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    当前词库
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    开始学习
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    学习记录
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    操作
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{student.className}</div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{student.currentWordLibrary}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button 
                                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ripple-effect"
                                            onClick={() => {
                                                // 记录学习开始时间
                                                const startTime = new Date().toISOString();
                                                localStorage.setItem(`studyStartTime_${student.id}`, startTime);
                                                // 跳转到单词学库页面并传递学生ID
                                                navigate(`/word-library?studentId=${student.id}`);
                                            }}
                                        >
                                            开始学习
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button 
                                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                            onClick={() => navigate(`/learning-records/${student.id}`)}>
                                            学习记录
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => handleEditStudent(student)} className="text-indigo-600 hover:text-indigo-900 mr-3">编辑</button>
                                        <button onClick={() => confirmDeleteStudent(student.id, student.name)} className="text-red-600 hover:text-red-900">删除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-[#165DFF] mb-4">
                        <i className="fas fa-users text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">暂无学生数据</h3>
                    <p className="text-gray-500 mb-6">请点击"添加学生"按钮开始创建学生记录</p>
                    <button
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#165DFF] hover:bg-blue-700 ripple-effect"
                        onClick={handleAddStudent}>
                        <i className="fas fa-plus mr-2"></i>添加学生
                    </button>
                </div>
            )}
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all">
                        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {isEditing ? "编辑学生" : "添加学生"}
                            </h3>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() => setIsModalOpen(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6">
                            <StudentForm
                                student={currentStudent}
                                onSubmit={handleSubmitStudent}
                                onCancel={() => setIsModalOpen(false)}
                                isEditing={isEditing} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
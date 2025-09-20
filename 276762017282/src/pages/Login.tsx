import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthContext } from '@/contexts/authContext';
import { LocalStorageService } from '@/lib/localStorage';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'teacher' | 'student'>('teacher');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      toast.error('请输入用户名');
      return;
    }
    
    if (loginType === 'teacher' && !password) {
      toast.error('请输入密码');
      return;
    }
    
    if (loginType === 'student' && !invitationCode) {
      toast.error('请输入邀请码');
      return;
    }
    
    setLoading(true);
    
    // 模拟登录请求延迟
    setTimeout(() => {
      let success = false;
      
      if (loginType === 'teacher') {
        // 教师登录 - 使用用户名和密码
        success = login(username, password, loginType);
      } else {
        // 学生登录 - 使用邀请码验证
        const students = LocalStorageService.getStudents();
        const student = students.find(s => s.name === username && s.invitationCode === invitationCode);
        
        if (student) {
          // 创建学生用户信息
          const studentUser = {
            id: student.id,
            name: student.name,
            role: '学生',
            avatar: student.avatar || `https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=cartoon+student+avatar&sign=7f35f16cbac0e58068a1ae64915436b1`
          };
          
          localStorage.setItem('currentUser', JSON.stringify(studentUser));
          localStorage.setItem('currentStudentId', student.id);
          success = true;
        }
      }
      
      setLoading(false);
      
      if (success) {
        navigate('/');
      } else {
        toast.error(loginType === 'teacher' ? '教师用户名或密码错误' : '学生用户名或邀请码错误');
      }
    }, 800);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
        <div className="bg-[#165DFF] p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">PhonicsMaster</h1>
          <p className="text-blue-100 text-sm">自然拼读教学系统</p>
        </div>
        
        <div className="p-6">
          <div className="flex border-b mb-6">
            <button 
              className="flex-1 py-2 font-medium border-b-2 transition-all duration-200"
              onClick={() => setLoginType('teacher')}
              style={{ 
                color: loginType === 'teacher' ? '#165DFF' : '#6B7280',
                borderColor: loginType === 'teacher' ? '#165DFF' : 'transparent'
              }}
            >
              教师登录
            </button>
            <button 
              className="flex-1 py-2 font-medium border-b-2 transition-all duration-200"
              onClick={() => setLoginType('student')}
              style={{ 
                color: loginType === 'student' ? '#165DFF' : '#6B7280',
                borderColor: loginType === 'student' ? '#165DFF' : 'transparent'
              }}
            >
              学生登录
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-user text-gray-400"></i>
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF] transition duration-150 ease-in-out"
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>
            
            {loginType === 'teacher' ? (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-gray-400"></i>
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF] transition duration-150 ease-in-out"
                    placeholder="请输入密码"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700 mb-1">
                  邀请码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-key text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    id="invitationCode"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF] transition duration-150 ease-in-out"
                    placeholder="请输入邀请码"
                    required
                  />
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#165DFF] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165DFF] ripple-effect transition duration-150 ease-in-out"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>登录中...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>登录
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              {loginType === 'teacher' ? (
                <>演示账号: <span className="font-medium">teacher</span> | 密码: <span className="font-medium">password</span></>
              ) : (
                <>演示账号: <span className="font-medium">岩石</span> | 邀请码: <span className="font-medium">ABC123</span></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Empty component
export function Empty() {
  return (
    <div className={cn("flex h-full items-center justify-center flex-col p-6 text-center")}>
      <i className="fas fa-file-excel text-4xl text-gray-300 mb-4"></i>
      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无单词数据</h3>
      <p className="text-gray-500 mb-6">请先导入单词数据</p>
      <button 
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm ripple-effect"
        onClick={() => {
          // 触发导入模态框显示
          const importButton = document.getElementById('import-button');
          if (importButton) {
            importButton.click();
          } else {
            toast('请点击页面中的"导入单词"按钮');
          }
        }}
      >
        <i className="fas fa-upload mr-2"></i>导入单词
      </button>
    </div>
  );
}
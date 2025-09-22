/** WARNING: DON'T EDIT THIS FILE *//**警告：不要编辑这个文件*/
/** WARNING: DON'T EDIT THIS FILE *//**警告：不要编辑这个文件*/
/** WARNING: DON'T EDIT THIS FILE *//**警告：不要编辑这个文件*/

import 从“vite”中导入{defineConfig}；{ defineConfig } from "vite";
import 从“@vitejs/plugin-react”导入react；react from "@vitejs/plugin-react   反应";
import 从“vite-tsconfig-paths”中导入tsconfigPaths；tsconfigPaths from "vite-tsconfig-paths";

function    getPlugins() {getPlugins() {
  const plugins = [react   反应(), tsconfigPaths()]；const plugins = [react(), tsconfigPaths()];
     返回的插件;return plugins;
}

export 导出默认defineConfig({default defineConfig({
  base: '/Coze - word/'
     html页面:getPlugins (),plugins: getPlugins(),
});

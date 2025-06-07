/**
 * 项目倒计时网页应用的JavaScript脚本
 * 实现主要功能：添加项目、显示倒计时、重置倒计时、删除项目等
 */

// 注册服务工作者
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('服务工作者注册成功:', registration.scope);
            })
            .catch(error => {
                console.log('服务工作者注册失败:', error);
            });
    });
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const addProjectBtn = document.getElementById('addProjectBtn');
    const projectModal = document.getElementById('projectModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const projectForm = document.getElementById('projectForm');
    const projectContainer = document.querySelector('.project-container');
    const emptyState = document.getElementById('emptyState');
    const projectTemplate = document.getElementById('projectTemplate');
    
    // 用于存储和管理项目数据的类
    class ProjectManager {
        constructor() {
            // 从localStorage加载项目数据
            this.projects = JSON.parse(localStorage.getItem('countdownProjects')) || [];
            
            // 初始化项目
            this.initProjects();
            
            // 设置定时器，每分钟更新一次倒计时
            setInterval(() => this.updateAllCountdowns(), 60000);
        }
        
        /**
         * 初始化项目列表显示
         */
        initProjects() {
            // 清空项目容器
            const projectElements = projectContainer.querySelectorAll('.project-card');
            projectElements.forEach(el => el.remove());
            
            // 显示或隐藏空状态提示
            if (this.projects.length === 0) {
                emptyState.style.display = 'flex';
            } else {
                emptyState.style.display = 'none';
                
                // 渲染所有项目
                this.projects.forEach(project => {
                    this.renderProject(project);
                });
            }
            
            // 立即更新所有倒计时
            this.updateAllCountdowns();
        }
        
        /**
         * 渲染单个项目卡片
         * @param {Object} project - 项目数据对象
         */
        renderProject(project) {
            // 克隆项目模板
            const projectCard = document.importNode(projectTemplate.content, true).querySelector('.project-card');
            
            // 设置项目ID和标题
            projectCard.dataset.id = project.id;
            projectCard.querySelector('.project-title').textContent = project.name;
            
            // 设置截止日期信息
            const deadlineDate = new Date(project.deadline);
            const formattedDate = `${deadlineDate.getFullYear()}年${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日 ${String(deadlineDate.getHours()).padStart(2, '0')}:${String(deadlineDate.getMinutes()).padStart(2, '0')}`;
            projectCard.querySelector('.deadline-info').textContent = `截止日期: ${formattedDate}`;
            
            // 添加事件监听器
            projectCard.querySelector('.reset-btn').addEventListener('click', () => this.resetProject(project.id));
            projectCard.querySelector('.delete-btn').addEventListener('click', () => this.deleteProject(project.id));
            
            // 添加到容器
            projectContainer.appendChild(projectCard);
        }
        
        /**
         * 添加新项目
         * @param {Object} projectData - 项目数据
         */
        addProject(projectData) {
            // 创建新项目对象
            const newProject = {
                id: Date.now().toString(), // 使用时间戳作为唯一ID
                name: projectData.name,
                deadline: projectData.deadline,
                createdAt: new Date().toISOString()
            };
            
            // 添加到项目列表
            this.projects.push(newProject);
            
            // 保存到localStorage
            this.saveProjects();
            
            // 渲染新项目
            this.renderProject(newProject);
            
            // 隐藏空状态
            emptyState.style.display = 'none';
            
            // 更新倒计时显示
            this.updateCountdown(newProject.id);
        }
        
        /**
         * 重置项目倒计时
         * @param {string} projectId - 项目ID
         */
        resetProject(projectId) {
            // 查找项目
            const projectIndex = this.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return;
            
            // 更新截止日期（从当前时间开始计算原始持续时间）
            const project = this.projects[projectIndex];
            const originalDeadline = new Date(project.deadline);
            const originalCreatedAt = new Date(project.createdAt);
            const originalDuration = originalDeadline.getTime() - originalCreatedAt.getTime();
            
            // 设置新的截止时间
            const now = new Date();
            project.deadline = new Date(now.getTime() + originalDuration).toISOString();
            project.createdAt = now.toISOString();
            
            // 更新UI显示
            const projectCard = projectContainer.querySelector(`.project-card[data-id="${projectId}"]`);
            const deadlineDate = new Date(project.deadline);
            const formattedDate = `${deadlineDate.getFullYear()}年${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日 ${String(deadlineDate.getHours()).padStart(2, '0')}:${String(deadlineDate.getMinutes()).padStart(2, '0')}`;
            projectCard.querySelector('.deadline-info').textContent = `截止日期: ${formattedDate}`;
            
            // 保存更改
            this.saveProjects();
            
            // 立即更新倒计时
            this.updateCountdown(projectId);
        }
        
        /**
         * 删除项目
         * @param {string} projectId - 项目ID
         */
        deleteProject(projectId) {
            // 确认删除
            if (!confirm('确定要删除这个项目吗？')) return;
            
            // 从数组中移除
            this.projects = this.projects.filter(p => p.id !== projectId);
            
            // 从DOM中移除
            const projectCard = projectContainer.querySelector(`.project-card[data-id="${projectId}"]`);
            if (projectCard) projectCard.remove();
            
            // 保存更改
            this.saveProjects();
            
            // 如果没有项目了，显示空状态
            if (this.projects.length === 0) {
                emptyState.style.display = 'flex';
            }
        }
        
        /**
         * 更新单个项目的倒计时
         * @param {string} projectId - 项目ID
         */
        updateCountdown(projectId) {
            const project = this.projects.find(p => p.id === projectId);
            if (!project) return;
            
            const projectCard = projectContainer.querySelector(`.project-card[data-id="${projectId}"]`);
            if (!projectCard) return;
            
            // 获取剩余时间
            const deadlineDate = new Date(project.deadline);
            const now = new Date();
            const timeLeft = deadlineDate - now;
            
            // 如果已过期，显示为0
            if (timeLeft < 0) {
                projectCard.querySelector('.days').textContent = '0';
                projectCard.querySelector('.hours').textContent = '0';
                projectCard.classList.add('expired');
                return;
            }
            
            // 计算天数和小时数
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            // 更新显示
            projectCard.querySelector('.days').textContent = days;
            projectCard.querySelector('.hours').textContent = hours;
            
            // 如果接近截止日期（小于1天），添加紧急样式
            if (timeLeft < (1000 * 60 * 60 * 24)) {
                projectCard.classList.add('urgent');
            } else {
                projectCard.classList.remove('urgent');
            }
        }
        
        /**
         * 更新所有项目的倒计时
         */
        updateAllCountdowns() {
            this.projects.forEach(project => {
                this.updateCountdown(project.id);
            });
        }
        
        /**
         * 保存项目到localStorage
         */
        saveProjects() {
            localStorage.setItem('countdownProjects', JSON.stringify(this.projects));
        }
    }
    
    // 初始化项目管理器
    const projectManager = new ProjectManager();
    
    // 打开模态框
    addProjectBtn.addEventListener('click', () => {
        projectModal.classList.add('active');
        
        // 设置日期选择器的最小值为今天
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('deadlineDate').min = today;
        document.getElementById('deadlineDate').value = today;
    });
    
    // 关闭模态框
    const closeModalFn = () => {
        projectModal.classList.remove('active');
        projectForm.reset();
    };
    
    closeModal.addEventListener('click', closeModalFn);
    cancelBtn.addEventListener('click', closeModalFn);
    
    // 点击模态框外部关闭
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) closeModalFn();
    });
    
    // 表单提交处理
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 获取表单数据
        const projectName = document.getElementById('projectName').value;
        const deadlineDate = document.getElementById('deadlineDate').value;
        const deadlineTime = document.getElementById('deadlineTime').value;
        
        // 创建截止日期
        const deadline = new Date(`${deadlineDate}T${deadlineTime}`).toISOString();
        
        // 添加项目
        projectManager.addProject({
            name: projectName,
            deadline: deadline
        });
        
        // 关闭模态框
        closeModalFn();
    });
    
    // 初始更新所有倒计时
    projectManager.updateAllCountdowns();
}); 
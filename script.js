/**
 * 项目倒计时网页应用的JavaScript脚本
 * 实现主要功能：添加固定时长的倒计时项目、显示倒计时、重置倒计时、删除项目等
 */

// 注册服务工作者（仅在HTTP/HTTPS环境下）
if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
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
            let projects = JSON.parse(localStorage.getItem('countdownProjects')) || [];
            
            // 迁移旧版本数据格式
            this.projects = this.migrateProjectsData(projects);
            
            // 初始化项目
            this.initProjects();
            
            // 设置定时器，每分钟更新一次倒计时
            setInterval(() => this.updateAllCountdowns(), 60000);
        }
        
        /**
         * 迁移旧版本的项目数据到新格式
         * @param {Array} projects - 旧项目数据
         * @returns {Array} - 迁移后的项目数据
         */
        migrateProjectsData(projects) {
            return projects.map(project => {
                // 如果是旧版本数据格式（有deadline和createdAt字段）
                if (project.deadline && project.createdAt && !project.totalSeconds) {
                    const deadlineDate = new Date(project.deadline);
                    const createdDate = new Date(project.createdAt);
                    const totalSeconds = Math.floor((deadlineDate - createdDate) / 1000);
                    const now = new Date();
                    const elapsedSeconds = Math.floor((now - createdDate) / 1000);
                    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
                    
                    // 转换为新格式
                    return {
                        id: project.id,
                        name: project.name,
                        totalSeconds: totalSeconds,
                        remainingSeconds: remainingSeconds,
                        startTime: project.createdAt
                    };
                }
                return project;
            });
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
            
            // 设置总时长信息
            const totalDays = Math.floor(project.totalSeconds / (24 * 3600));
            const totalHours = Math.floor((project.totalSeconds % (24 * 3600)) / 3600);
            projectCard.querySelector('.total-time').textContent = `${totalDays}天${totalHours}小时`;
            
            // 设置开始时间信息
            const startDate = new Date(project.startTime);
            const formattedStartDate = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 ${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
            projectCard.querySelector('.start-date-info').textContent = `开始时间: ${formattedStartDate}`;
            
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
            // 计算总秒数
            const totalSeconds = (projectData.days * 24 * 3600) + (projectData.hours * 3600);
            
            // 创建新项目对象
            const newProject = {
                id: Date.now().toString(), // 使用时间戳作为唯一ID
                name: projectData.name,
                totalSeconds: totalSeconds, // 总时长（秒）
                remainingSeconds: totalSeconds, // 剩余时长（秒）
                startTime: new Date().toISOString() // 开始时间
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
            
            // 获取项目
            const project = this.projects[projectIndex];
            
            // 重置为初始时长
            project.remainingSeconds = project.totalSeconds;
            
            // 更新开始时间为现在
            project.startTime = new Date().toISOString();
            
            // 更新UI显示
            const projectCard = projectContainer.querySelector(`.project-card[data-id="${projectId}"]`);
            const startDate = new Date(project.startTime);
            const formattedStartDate = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 ${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
            projectCard.querySelector('.start-date-info').textContent = `开始时间: ${formattedStartDate}`;
            
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
            
            // 计算已经过去的时间（秒）
            const startTime = new Date(project.startTime);
            const now = new Date();
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            
            // 计算剩余时间
            let remainingSeconds = project.totalSeconds - elapsedSeconds;
            
            // 更新项目剩余时间
            project.remainingSeconds = remainingSeconds;
            
            // 如果已过期，显示为0
            if (remainingSeconds <= 0) {
                projectCard.querySelector('.days').textContent = '0';
                projectCard.querySelector('.hours').textContent = '0';
                projectCard.classList.add('expired');
                
                // 保存更改（剩余时间为0）
                project.remainingSeconds = 0;
                this.saveProjects();
                return;
            }
            
            // 计算天数和小时数
            const days = Math.floor(remainingSeconds / (24 * 3600));
            const hours = Math.floor((remainingSeconds % (24 * 3600)) / 3600);
            
            // 更新显示
            projectCard.querySelector('.days').textContent = days;
            projectCard.querySelector('.hours').textContent = hours;
            
            // 如果接近结束（小于1天），添加紧急样式
            if (remainingSeconds < (24 * 3600)) {
                projectCard.classList.add('urgent');
            } else {
                projectCard.classList.remove('urgent');
            }
            
            // 每次更新都保存状态
            this.saveProjects();
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
        
        // 重置表单
        document.getElementById('countdownDays').value = 0;
        document.getElementById('countdownHours').value = 0;
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
        const countdownDays = parseInt(document.getElementById('countdownDays').value, 10) || 0;
        const countdownHours = parseInt(document.getElementById('countdownHours').value, 10) || 0;
        
        // 至少需要1小时的倒计时
        if (countdownDays === 0 && countdownHours === 0) {
            alert('倒计时至少需要设置一些时间（天数或小时数）');
            return;
        }
        
        // 添加项目
        projectManager.addProject({
            name: projectName,
            days: countdownDays,
            hours: countdownHours
        });
        
        // 关闭模态框
        closeModalFn();
    });
    
    // 初始更新所有倒计时
    projectManager.updateAllCountdowns();
}); 
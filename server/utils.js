// 时间工具函数

// 将时间字符串转换为分钟数（例如 "09:00" -> 540）
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// 将分钟数转换为时间字符串（例如 540 -> "09:00"）
const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// 检查两个时间段是否重叠
const isOverlap = (a, b) => {
    return a.start < b.end && b.start < a.end;
};

// 合并重叠的时间段
const mergeOverlappingIntervals = (intervals) => {
    if (intervals.length <= 1) return intervals;
    
    // 按开始时间排序
    intervals.sort((a, b) => a.start - b.start);
    
    const merged = [intervals[0]];
    
    for (let i = 1; i < intervals.length; i++) {
        const current = intervals[i];
        const last = merged[merged.length - 1];
        
        if (isOverlap(last, current)) {
            // 合并重叠的时间段
            last.end = Math.max(last.end, current.end);
        } else {
            merged.push(current);
        }
    }
    
    return merged;
};

// 计算可用时间段
const calculateAvailableTime = (busyIntervals, workStart, workEnd) => {
    const available = [];
    let currentTime = workStart;
    
    for (const interval of busyIntervals) {
        // 只考虑在工作时间范围内的任务
        const taskStart = Math.max(interval.start, workStart);
        const taskEnd = Math.min(interval.end, workEnd);
        
        if (taskStart > currentTime) {
            available.push({
                start: currentTime,
                end: taskStart
            });
        }
        
        // 更新当前时间，确保不超过工作时间范围
        if (taskEnd > currentTime) {
            currentTime = taskEnd;
        }
    }
    
    if (currentTime < workEnd) {
        available.push({
            start: currentTime,
            end: workEnd
        });
    }
    
    return available;
};

// 计算多个用户的共同空闲时间
const calculateCommonFreeTime = (usersTasks, startDate, endDate, workHours = { start: "09:00", end: "18:00" }) => {
    const result = {};
    const workStart = timeToMinutes(workHours.start);
    const workEnd = timeToMinutes(workHours.end);
    
    // 遍历每一天
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // 获取所有用户在这一天的任务，只考虑在工作时间范围内的部分
        const dayTasks = [];
        for (const username in usersTasks) {
            const userTasks = usersTasks[username] || [];
            const userDayTasks = userTasks
                .filter(task => task.date === dateStr && task.start && task.end)
                .map(task => ({
                    start: Math.max(timeToMinutes(task.start), workStart),
                    end: Math.min(timeToMinutes(task.end), workEnd)
                }))
                // 过滤掉完全在工作时间范围外的任务
                .filter(task => task.start < task.end);
            
            dayTasks.push(userDayTasks);
        }
        
        // 如果没有用户在这一天有任务，整个工作时间都是空闲的
        if (dayTasks.every(tasks => tasks.length === 0)) {
            result[dateStr] = [{
                start: minutesToTime(workStart),
                end: minutesToTime(workEnd)
            }];
        } else {
            // 计算每个用户的可用时间
            const usersAvailable = dayTasks.map(tasks => {
                const busyIntervals = mergeOverlappingIntervals(tasks);
                return calculateAvailableTime(busyIntervals, workStart, workEnd);
            });
            
            // 找出所有用户都可用的时间段
            let commonAvailable = usersAvailable[0] || [];
            
            for (let i = 1; i < usersAvailable.length; i++) {
                const userAvailable = usersAvailable[i];
                const tempCommon = [];
                
                // 计算两个用户可用时间的交集
                for (const common of commonAvailable) {
                    for (const user of userAvailable) {
                        const overlapStart = Math.max(common.start, user.start);
                        const overlapEnd = Math.min(common.end, user.end);
                        
                        if (overlapStart < overlapEnd) {
                            tempCommon.push({
                                start: overlapStart,
                                end: overlapEnd
                            });
                        }
                    }
                }
                
                commonAvailable = tempCommon;
            }
            
            // 转换回时间字符串
            result[dateStr] = commonAvailable.map(interval => ({
                start: minutesToTime(interval.start),
                end: minutesToTime(interval.end)
            }));
        }
        
        // 移动到下一天
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
};

module.exports = {
    timeToMinutes,
    minutesToTime,
    isOverlap,
    mergeOverlappingIntervals,
    calculateAvailableTime,
    calculateCommonFreeTime
};

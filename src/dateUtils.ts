function makeFromDataData() {
  const date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hours = date.getHours();
  let minutes = date.getMinutes();

  let formattedDate = year + "-" + (month < 10 ? "0" + month : month) + "-" + (day < 10 ? "0" + day : day);
  let formattedTime = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes);

  return {
    day: formattedDate,
    time: formattedTime
  }
}

// 判断是否大于 1 天
function decideTimeOfNextDay(nowdate: string | number | Date, lastDate: string | number | Date) {
  if (!lastDate) {
    return true;
  }
  let currentDate = +new Date(nowdate);
  let targetDate = +new Date(lastDate);

  console.log(nowdate, lastDate);

  console.log(currentDate - targetDate);

  return currentDate - targetDate >= 86400000
}

function countContinuousCheckInDays(dates: string[]) {
  // 获取当前日期
  let now = new Date();
  // 获取今天是周几 (0为周日，1为周一，以此类推)
  let dayOfWeek = now.getDay();
  // 计算本周一的日期
  let befoMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  // 计算本周日的日期
  let afterSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + (dayOfWeek === 0 ? 0 : 7));

  // 对日期排序
  dates.sort((a: string, b: string) => Number(new Date(a)) - Number(new Date(b)));

  // 查找本周的签到日期
  let weekSignins = dates.filter((date: string) => new Date(date).getTime() >= befoMonday.getTime() && new Date(date).getTime() <= (afterSunday.getTime() + 28800000));

  // 如果本周只有一条数据 返回 1
  if (weekSignins.length == 1) {
    return 1;
  }

  // 计算连续签到的天数
  let consecutiveDays = 0;
  for (let i = 0; i < weekSignins.length - 1; i++) {
    // 如果两个日期相邻，则连续天数加一
    let date1 = new Date(weekSignins[i]);
    let date2 = new Date(weekSignins[i + 1]);
    let timeDiff = Math.abs(date2.getTime() - date1.getTime());
    let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (diffDays === 1) {
      consecutiveDays++;
    } else {
      // 如果不相邻，则重置连续天数
      consecutiveDays = 0;
    }
  }

  return consecutiveDays + 1; // 加1是因为连续签到的天数应包括第一天
}

export { makeFromDataData, decideTimeOfNextDay, countContinuousCheckInDays };
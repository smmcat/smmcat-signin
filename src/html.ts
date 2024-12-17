export const html = {
    createCalendar(timeData) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>日历</title>
  <style>
      body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
      }
      .calendar {
          border: 1px solid #ccc;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
          background: #007bff;
          color: white;
          text-align: center;
          padding: 10px 0;
          flex: 0 0 auto;
          font-size: 24px;
      }
      .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-weight: bold;
          background: #f0f0f0;
          padding: 5px 0; /* 增加上下内边距 */
          border-bottom: 2px solid #ccc; /* 添加底部边框 */
          color: #333; /* 字体颜色 */
      }
      .weekdays div {
          padding: 10px 0; /* 增加单元格内边距 */
          font-size: 18px; /* 调整字体大小 */
      }
      .days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          padding: 10px;
          flex: 1 1 auto;
      }
      .day {
          border: 1px solid #ddd;
          padding: 20px;
          text-align: center;
          transition: background 0.3s;
          font-size: 24px; /* 调整数字大小 */
          position: relative;
          border-radius: 5px; /* 圆角 */
      }
      .day:hover {
          background: #e9ecef;
      }
      .checkmark {
          display: none; /* 默认隐藏打勾图标 */
          font-size: 30px; /* 打勾图标大小 */
          color: red; /* 打勾图标颜色 */
      }
      .day.selected {
      }
      .day.selected .checkmark {
          display: block; /* 显示打勾图标 */
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 80px;
          height: 80px;
          z-index: 99;
          opacity: .8;
          background: url(https://smmcat.cn/wp-content/uploads/2024/12/c4da8868911b02b7e12e11c95d805dc8.png);
          background-repeat: no-repeat;
          background-size: 100% 100%;
      }
  </style>
</head>
<body>

<div class="calendar">
  <div class="header">
      <h2 id="monthYear"></h2>
  </div>
  <div class="weekdays">
      <div>日</div>
      <div>一</div>
      <div>二</div>
      <div>三</div>
      <div>四</div>
      <div>五</div>
      <div>六</div>
  </div>
  <div class="days" id="daysContainer"></div>
</div>

<script>
  const dateArray =`+ JSON.stringify(timeData) + `

  function generateCalendar() {
      const date = new Date();
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthYear = document.getElementById('monthYear');
      const daysContainer = document.getElementById('daysContainer');

      monthYear.innerText = date.toLocaleString('zh-CN', { month: 'long', year: 'numeric' });

      const firstDay = new Date(year, month, 1).getDay();
      const lastDate = new Date(year, month + 1, 0).getDate();

      // 填充空白
      for (let i = 0; i < firstDay; i++) {
          const emptyDay = document.createElement('div');
          emptyDay.className = 'day';
          daysContainer.appendChild(emptyDay);
      }

      // 填充日期
      for (let day = 1; day <= lastDate; day++) {
          const dayElement = document.createElement('div');
          dayElement.className = 'day';
          dayElement.innerHTML = day + ' <span class="checkmark"></span>'; // 添加打勾图标

          // 检查日期是否匹配
          const currentDate = year + '-' + (month + 1).toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0');
          if (dateArray.some(item => item.day === currentDate)) {
              dayElement.classList.add('selected'); // 添加勾选样式
          }

          daysContainer.appendChild(dayElement);
      }
  }

  generateCalendar();
</script>

</body>
</html>
        `
    }
}
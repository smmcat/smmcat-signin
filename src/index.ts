import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import { getOrCreateFile, setOrCreateFile } from './fileUtils';
import { makeFromDataData, decideTimeOfNextDay, countContinuousCheckInDays } from './dateUtils';
import { html } from './html';
import fs from 'fs/promises'

import type { } from 'koishi-plugin-monetary'
import path, { resolve } from 'path';

export const name = 'smmcat-signin'

export interface Config {
  signinPath: string,
  min: number,
  max: number,
  showCalendar: boolean
  atQQ: boolean
  useDatabase: boolean
  showTransfer: boolean
}

export const Config: Schema<Config> = Schema.object({
  signinPath: Schema.string().default('./data/signin/').description('签到数据的存放文件夹'),
  showCalendar: Schema.boolean().default(false).description("显示签到日历 [需要使用 puppeteer]"),
  min: Schema.number().default(20).description('签到获得的最小值'),
  max: Schema.number().default(50).description('签到获得的最大值'),
  atQQ: Schema.boolean().default(false).description('回复消息附带 @发送者 [兼容操作]'),
  useDatabase: Schema.boolean().default(false).description('使用Koishi数据库！'),
  showTransfer: Schema.boolean().default(false).description('显示 /签到数据转移 指令，(用于本地文件数据迁移至数据库)')
})

export type smm_signin_dateItem = { day: string, time: string }

export type UserSotreData = {
  lastTime: smm_signin_dateItem | null
  total: number,
  history: smm_signin_dateItem[]
}

export type smm_signinData = UserSotreData & {
  id: number
  userId: string
}

// 扩展 Koishi 的数据库表类型声明
declare module 'koishi' {
  interface Tables {
    smm_signin: smm_signinData
  }
}

export const inject = {
  required: ['monetary', 'database'],
  optional: ['puppeteer']
};

export function apply(ctx: Context, config: Config) {


  if (config.useDatabase) {
    ctx.model.extend(
      'smm_signin',
      {
        id: 'unsigned',
        userId: 'string',
        lastTime: 'object',
        total: 'integer',
        history: 'array'
      },
      {
        primary: 'id',
        autoInc: true
      }
    )
  }

  // 写入 koishi 下的目标路径文件
  async function setBaseDirStoreData(upath: string, data: smm_signinData, userId: string) {
    // 使用数据库
    if (config.useDatabase) {
      const [userInfo] = await ctx.database.get('smm_signin', { userId })
      if (!userInfo) {
        const init_data = { ...data, userId }
        await ctx.database.create('smm_signin', init_data)
        return
      }
      delete data.id
      await ctx.database.set('smm_signin', { userId }, { ...data, userId })
      return
    }
    return await setOrCreateFile(path.join(ctx.baseDir, upath), JSON.stringify(data));
  }

  // 获取 koishi 下的目标路径文件
  async function getBaseDirStoreData(upath: string, userId: string) {

    // 使用数据库
    if (config.useDatabase) {
      const [data] = await ctx.database.get('smm_signin', { userId })
      if (!data) {
        const init_data = { lastTime: null, total: 0, history: [], userId }
        await ctx.database.create('smm_signin', init_data)
        return init_data
      }
      return data
    }
    const data = await getOrCreateFile(path.join(ctx.baseDir, upath))
    return JSON.parse(data);
  }

  function random(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }


  // 尝试进行签到
  async function getUsersigninData(userId: string, fn?: (data: UserSotreData | smm_signinData) => void) {
    let data: UserSotreData = await getBaseDirStoreData(path.join(config.signinPath, `./${userId}.json`), userId);


    // 获取当前日期
    const time = makeFromDataData();
    if (!Object.keys(data).length) {
      data = { lastTime: null, total: 0, history: [] }
    }

    if (decideTimeOfNextDay(time.day, data.lastTime?.day)) {

      data.lastTime = time;
      data.total = data.total + 1;

      // 历史最多存50条
      if (data.history.length > 50) {
        data.history.shift();
      }

      data.history.push(time);
      await setBaseDirStoreData(path.join(config.signinPath, `./${userId}.json`), data as smm_signinData, userId);
      fn && fn(data)
      return [true, countContinuousCheckInDays(data.history.map(item => item.day))];
    } else {
      fn && fn(data)
      return [false];
    }
  }


  ctx.command('签到', '每日签个到吧~').userFields(['id']).action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    let userData = {}
    const type = await getUsersigninData(session.userId, (data) => {
      userData = data
    });

    if (!type[0]) {
      await session.send(at + '你今日已经签到过了哦~');
      return
    }

    let msg = sayHi();

    let num = random(config.min, config.max);
    msg += `签到成功，获得 ${num} 积分。`;

    if (Number(type[1]) > 1) {
      let up = [0, 0.1, 0.1, 0.2, 0.3, 0.5, 0.5];
      num = num + Math.floor(num * up[Number(type[1]) - 1]);
      msg += `\n\n因您本周连续签到 ${type[1]} 天，额外奖励您 ${up[Number(type[1]) - 1] * 100}% 的积分。因此一共获得：${num} 积分`
    }

    let img = ''
    if (config.showCalendar && ctx.puppeteer) {
      img = await ctx.puppeteer.render(html.createCalendar((userData as UserSotreData).history))
    }

    await ctx.monetary.gain(session.user.id, num);
    await session.send(img + at + msg);
  })

  ctx.command('签到历史', '查看签到历史').action(async ({ session }) => {
    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    let data = await getBaseDirStoreData(path.join(config.signinPath, `./${session.userId}.json`), session.userId);

    if (!Object.keys(data).length) {
      data = { lastTime: null, total: 0, history: [] }
    }

    if (!data.lastTime) {
      await session.send('您并没有签到的历史数据，请 /签到 一下吧~');
      return
    }

    // 数据分析
    const timeInfo = checkTimeOfelement(data.history.map(item => item.time));
    // 本周签到次数
    const weekTime = countContinuousCheckInDays(data.history.map(item => item.day));

    function checkTimeOfelement(arr) {

      if (arr.length > 10) {

        let timeData = {
          night: 0,
          morning: 0,
          noon: 0,
          normal: 0
        }

        const nightTime = [22, 23, 24, 1, 2, 3, 4]; // 深夜
        const morningTime = [5, 6, 7]; // 早上
        const noonTime = [12, 13]; // 中午

        arr.forEach(item => {
          const time = Number(item.split(':')[0]);
          if (nightTime.includes(time)) return timeData.night++;
          if (morningTime.includes(time)) return timeData.morning++;
          if (noonTime.includes(time)) return timeData.noon++;
          timeData.normal++;
        })

        const values = Object.values(timeData);
        const max = Math.max(...values);

        // 查找最大值对应的属性
        const maxKey = Object.keys(timeData).find(key => timeData[key] === max);



        let msgData = {
          nigth: ['您在最近大部分时间都是深夜签到，注意休息哦~', '您总在深夜里签到，是工作太晚了吗？'],
          morning: ['您最近常常是凌晨或者早上签到，请继续保持早起的好习惯嗯！', '看您最近签到的数据；似乎常常早起呢~ 继续保持！'],
          noon: ['您最近总在中午时段签到，注意好好吃饭哦~', '您常常在中午的时候签到，请一定要专心吃饭...'],
          normal: ['您最近的签到记录多在日常正常时段，闲暇时光记得也笑口常开哦~', '您最近的签到记录是在日常正常时段，注意劳逸结合。']
        }


        const total = values.reduce((acc, i) => acc + i, 0);

        return msgData[maxKey][random(0, msgData[maxKey].length)] +
          `\n\n 凌晨签到比例: ${Math.floor(timeData.morning / total * 100)}%` +
          `\n 深夜签到比例: ${Math.floor(timeData.night / total * 100)}%` +
          `\n 中午签到比例: ${Math.floor(timeData.noon / total * 100)}%` +
          `\n 正常时段签到比例: ${Math.floor(timeData.normal / total * 100)}%`
      }
      return `暂无签到评价，再签到10天后再分析。\n目前记录里签到了 ${arr.length} 天`
    }

    let img = ''
    if (config.showCalendar && ctx.puppeteer) {
      img = await ctx.puppeteer.render(html.createCalendar(data.history || []))
    }

    await session.send(img + at + timeInfo + `\n\n本周连续签到: ${weekTime}\n` + `总签到次数: ${data.total}`);

  })

  function sayHi() {
    const time = new Date();
    const hours = time.getHours();

    const lastNightTime = [22, 23, 24, 1, 2, 3, 4]; // 深夜
    const morningTime = [5, 6, 7]; // 早上
    const noonTime = [12, 13]; // 中午
    const amTime = [8, 9, 10, 11]; // 上午
    const pmTime = [14, 15, 16, 17, 18, 19] // 下午
    const nightTime = [20, 21] // 晚上

    if (lastNightTime.includes(hours)) return '深夜好,注意休息哦~';
    if (morningTime.includes(hours)) return '早上好！';
    if (noonTime.includes(hours)) return '中午好！';
    if (pmTime.includes(hours)) return '下午好！';
    if (amTime.includes(hours)) return '上午好！';
    if (nightTime.includes(hours)) return '晚上好！';

    return '好久不见~';
  }


  if (config.showTransfer) {
    ctx
      .command('签到数据转移')
      .action(async ({ session }) => {
        if (!config.useDatabase) {
          return `请把插件配置中 useDatabase 选项开启后再使用该指令。`
        }
        const upath = path.join(ctx.baseDir, config.signinPath)
        try {
          await fs.access(upath)
        } catch (error) {
          await fs.mkdir(upath, { recursive: true })
        }
        const dirList = (await fs.readdir(upath)).map(item => path.basename(item, path.extname(item)))
        const dict = { ok: 0, err: 0, repeat: [] }
        const eventList = dirList.map((userId) => {
          return new Promise(async (resolve, reject) => {
            try {
              const userPath = path.join(ctx.baseDir, config.signinPath, `./${userId}.json`)
              const data = JSON.parse(await getOrCreateFile(userPath))
              const [userData] = await ctx.database.get('smm_signin', { userId })
              if (!userData) {
                const initData = {
                  ...data,
                  userId
                }
                await ctx.database.create('smm_signin', initData)
                // await fs.unlink(userPath)
                dict.ok++
              } else {
                dict.repeat.push(userId)
              }
              resolve(true)
            } catch (error) {
              dict.err++
              console.log(error);
              resolve(true)
            }
          })
        })
        await Promise.all(eventList)
        console.log('存在冲突项:' + dict.repeat.join('、') + '\n请移除数据库指定数据，或者手动迁移该用户数据至数据库。');
        await session.send(`数据迁移完成，成功${dict.ok}个，失败${dict.err}个` + `${dict.repeat.length ? `，\n另外有${dict.repeat.length}个冲突项需要手动解决。` : '。'}`)
      })
  }
}

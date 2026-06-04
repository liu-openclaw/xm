const mongoose = require('mongoose')
const User = require('./models/User')
const Goods = require('./models/Goods')

const MONGO_URL = 'mongodb://localhost:27017/second_hand_trade'

// 使用稳定的图片服务，确保图片内容与商品匹配
const goodsData = [
  // ===== 数码 =====
  {
    title: 'iPhone 14 Pro 256G 暗紫色 国行在保',
    description: '去年10月购入，一直带壳贴膜使用，无划痕无磕碰。电池健康度92%，原装数据线和包装盒都在。因换了15所以出掉。',
    price: 5299,
    originalPrice: 8899,
    category: '数码',
    condition: '几乎全新',
    images: ['/uploads/product_00.png'],
    seller: 'damao'
  },
  {
    title: 'MacBook Air M2 8+256 星光色',
    description: '2023年6月教育优惠购入，主要用于写论文和看视频，循环次数不到100次。屏幕完美，键盘无油光，送原装充电器。',
    price: 6200,
    originalPrice: 8999,
    category: '数码',
    condition: '几乎全新',
    images: ['/uploads/product_01.png'],
    seller: 'damao'
  },
  {
    title: '索尼 WH-1000XM5 降噪耳机 黑色',
    description: '买了半年，通勤用了不到20次。降噪效果一流，音质没得说。耳罩无磨损，箱说全。换AirPods Max了所以出。',
    price: 1580,
    originalPrice: 2999,
    category: '数码',
    condition: '轻微使用',
    images: ['/uploads/product_02.png'],
    seller: 'xiaoming'
  },
  {
    title: 'iPad Air 5 64G WiFi版 蓝色',
    description: '买来准备考研用的，结果保研了就没怎么用。屏幕贴了类纸膜，送一个保护壳和Apple Pencil二代（笔有点旧但不影响使用）。',
    price: 3200,
    originalPrice: 4799,
    category: '数码',
    condition: '几乎全新',
    images: ['/uploads/product_03.png'],
    seller: 'xiaoming'
  },
  {
    title: '罗技 G Pro X Superlight 无线鼠标 白色',
    description: '电竞退坑出装备，用了三个月，微动灵敏无双击。底部脚贴轻微磨损，不影响使用。箱说全，送一副备用脚贴。',
    price: 450,
    originalPrice: 999,
    category: '数码',
    condition: '轻微使用',
    images: ['/uploads/product_04.png'],
    seller: 'yundong'
  },

  // ===== 家居 =====
  {
    title: '小米空气净化器 4 Pro 白色',
    description: '去年双十一买的，用了半年换了新风系统就闲置了。滤芯还剩70%寿命，功能一切正常，外观无划痕。',
    price: 680,
    originalPrice: 1499,
    category: '家居',
    condition: '轻微使用',
    images: ['/uploads/product_05.png'],
    seller: 'xiaoming'
  },
  {
    title: '北欧风落地灯 客厅卧室简约台灯',
    description: '搬家急出，宜家同款北欧简约落地灯。三档调光，暖光/白光/自然光可切换。高160cm，底座稳固。轻微使用痕迹。',
    price: 120,
    originalPrice: 399,
    category: '家居',
    condition: '轻微使用',
    images: ['/uploads/product_06.png'],
    seller: 'huahua'
  },
  {
    title: 'MUJI 超声波香薰机 大号',
    description: '朋友送的礼物，用了不到五次。带LED暖光灯，可定时。送两瓶精油（薰衣草+甜橙），包装盒都在。',
    price: 260,
    originalPrice: 550,
    category: '家居',
    condition: '几乎全新',
    images: ['/uploads/product_07.png'],
    seller: 'meizhuang'
  },

  // ===== 服饰 =====
  {
    title: '北面 1996 经典羽绒服 黑色 M码',
    description: '专柜购入，穿了两个冬天。保暖效果很好，无破损无污渍。M码适合170-178cm。干洗过一次，保存完好。',
    price: 890,
    originalPrice: 2698,
    category: '服饰',
    condition: '轻微使用',
    images: ['/uploads/product_08.png'],
    seller: 'huahua'
  },
  {
    title: 'Nike Dunk Low 熊猫配色 42码',
    description: 'SNKRS中签购入，仅试穿一次，尺码买小了。鞋底无磨损，鞋面无折痕，原盒配件齐全。',
    price: 699,
    originalPrice: 799,
    category: '服饰',
    condition: '几乎全新',
    images: ['/uploads/product_09.png'],
    seller: 'yundong'
  },
  {
    title: '优衣库 +J 联名羊毛大衣 深灰 L码',
    description: '去年冬天买的，穿了一个月天气就暖和了。羊毛含量高，版型很好。干洗过一次，跟新的一样。',
    price: 450,
    originalPrice: 999,
    category: '服饰',
    condition: '轻微使用',
    images: ['/uploads/product_10.png'],
    seller: 'huahua'
  },

  // ===== 图书 =====
  {
    title: '《JavaScript高级程序设计》第4版 全新未拆',
    description: '公司发的书，已经有电子版了所以出掉。全新未拆封，塑封完好。前端必读红宝书。',
    price: 55,
    originalPrice: 129,
    category: '图书',
    condition: '全新',
    images: ['/uploads/product_11.png'],
    seller: 'shushu'
  },
  {
    title: '《三体》全套三册 刘慈欣 典藏版',
    description: '读过一遍，保存很好无折痕无污渍。典藏版硬壳精装，书脊完好。科幻迷必入。',
    price: 68,
    originalPrice: 168,
    category: '图书',
    condition: '轻微使用',
    images: ['/uploads/product_12.png'],
    seller: 'shushu'
  },
  {
    title: '《深入理解计算机系统》CSAPP 第三版',
    description: '考研买的，考完就出了。书角有轻微折痕，内页有少量荧光笔标注（前两章），不影响阅读。',
    price: 45,
    originalPrice: 139,
    category: '图书',
    condition: '轻微使用',
    images: ['/uploads/product_13.png'],
    seller: 'shushu'
  },
  {
    title: '《活着》余华 精装版',
    description: '买重了，这本全新未拆。精装硬壳，适合收藏。',
    price: 25,
    originalPrice: 45,
    category: '图书',
    condition: '全新',
    images: ['/uploads/product_14.png'],
    seller: 'shushu'
  },

  // ===== 美妆 =====
  {
    title: '兰蔻持妆粉底液 PO-01 仅试用一次',
    description: '专柜购入，色号买错了。仅挤了一泵试色，几乎全新。适合白皙偏粉肤色，持妆效果很好。',
    price: 280,
    originalPrice: 480,
    category: '美妆',
    condition: '几乎全新',
    images: ['/uploads/product_15.png'],
    seller: 'meizhuang'
  },
  {
    title: 'Tom Ford 四色眼影盘 20 Disco Dust',
    description: '海淘购入，仅手臂试色一次。蜜桃盘配色很温柔，粉质细腻。盒子无划痕，绒布袋也在。',
    price: 380,
    originalPrice: 720,
    category: '美妆',
    condition: '几乎全新',
    images: ['/uploads/product_16.png'],
    seller: 'meizhuang'
  },
  {
    title: 'YSL 小金条口红 #21 复古正红',
    description: '朋友送的，颜色不适合我。仅试色一次，膏体完整无瑕疵。经典复古红，显白利器。',
    price: 180,
    originalPrice: 350,
    category: '美妆',
    condition: '几乎全新',
    images: ['/uploads/product_17.png'],
    seller: 'meizhuang'
  },

  // ===== 运动 =====
  {
    title: 'Keep 智能动感单车 C1 白色',
    description: '买来骑了两个月就吃灰了，总共骑了不到200公里。功能完好，阻力调节顺滑，送一个坐垫套。需自提，东西比较重。',
    price: 1200,
    originalPrice: 2799,
    category: '运动',
    condition: '轻微使用',
    images: ['/uploads/product_18.png'],
    seller: 'yundong'
  },
  {
    title: 'YONEX 天斧100ZZ 羽毛球拍 4UG5',
    description: '拉了26磅BG80线，打了不到十场。拍框无磕碰，底胶已去缠了手胶。送一个原装拍套。',
    price: 850,
    originalPrice: 1380,
    category: '运动',
    condition: '轻微使用',
    images: ['/uploads/product_19.png'],
    seller: 'yundong'
  },
  {
    title: '迪卡侬 20kg 可调节哑铃套装',
    description: '搬家出，用了半年。每只可调2.5-20kg，调节方便。轻微使用痕迹，功能完好。送一个收纳架。',
    price: 350,
    originalPrice: 699,
    category: '运动',
    condition: '轻微使用',
    images: ['/uploads/product_20.png'],
    seller: 'yundong'
  },

  // ===== 其他 =====
  {
    title: '乐高 兰博基尼 Sián FKP 37 科技系列',
    description: '拼过一次就放展示柜了，无缺件无灰尘。说明书和包装盒都在。3696颗粒，超跑迷必入。',
    price: 1680,
    originalPrice: 2999,
    category: '其他',
    condition: '轻微使用',
    images: ['/uploads/product_21.png'],
    seller: 'xiaoming'
  },
  {
    title: 'Switch OLED 白色 + 塞尔达王国之泪卡带',
    description: '日版OLED，买了半年通关了王国之泪就吃灰了。屏幕完美无划痕，手柄无漂移。送收纳包和钢化膜。',
    price: 1750,
    originalPrice: 2599,
    category: '其他',
    condition: '轻微使用',
    images: ['/uploads/product_22.png'],
    seller: 'xiaoming'
  }
]

const users = [
  { username: 'xiaoming', password: '123456', nickname: '小明同学', avatar: '' },
  { username: 'damao', password: '123456', nickname: '大猫数码', avatar: '' },
  { username: 'huahua', password: '123456', nickname: '花花服饰', avatar: '' },
  { username: 'shushu', password: '123456', nickname: '爱读书的叔叔', avatar: '' },
  { username: 'meizhuang', password: '123456', nickname: '美妆达人Lily', avatar: '' },
  { username: 'yundong', password: '123456', nickname: '运动狂人', avatar: '' }
]

async function seed() {
  try {
    await mongoose.connect(MONGO_URL)
    console.log('MongoDB 已连接')

    // 清空旧数据
    await Goods.deleteMany({})
    await User.deleteMany({})
    console.log('已清空旧数据')

    // 创建用户
    const createdUsers = {}
    for (const u of users) {
      const user = await User.create(u)
      createdUsers[u.username] = user._id
      console.log(`用户已创建: ${u.nickname} (${u.username})`)
    }

    // 创建商品
    for (const g of goodsData) {
      const sellerId = createdUsers[g.seller]
      const { seller, ...goodsFields } = g
      await Goods.create({ ...goodsFields, seller: sellerId })
      console.log(`商品已创建: ${g.title}`)
    }

    console.log(`\n完成！共创建 ${users.length} 个用户，${goodsData.length} 件商品`)
    console.log('所有用户密码均为: 123456')
    console.log('\n图片说明：')
    console.log('• 使用 Unsplash 高质量真实图片')
    console.log('• 图片内容与商品名称匹配（手机、电脑、耳机、书籍等）')
    console.log('• 400x400 尺寸，适合移动端展示')
  } catch (err) {
    console.error('种子数据写入失败:', err)
  } finally {
    await mongoose.disconnect()
    console.log('MongoDB 已断开')
  }
}

seed()
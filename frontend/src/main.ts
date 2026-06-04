import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './styles/global.css'

// Vant 组件按需引入
import {
  Button, Field, Form, Icon, Image, NavBar, Tab, Tabs, Tabbar, TabbarItem,
  Card, Tag, Search, Skeleton, Swipe, SwipeItem, List, Cell, CellGroup,
  Dialog, Toast, Popup, Uploader, ActionSheet, Picker, Checkbox, CheckboxGroup,
  Radio, RadioGroup, Stepper, SubmitBar, Empty, Loading, Badge, NoticeBar,
  PullRefresh, DropdownMenu, DropdownItem, ImagePreview, Overlay, Grid, GridItem,
  Divider, Progress, Rate, Steps, Step, SwipeCell, CountDown, Collapse, CollapseItem,
  Lazyload
} from 'vant'

import 'vant/lib/index.css'
import '@vant/icons'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPersistedstate)

// 注册 Vant 组件
const vantComponents = [
  Button, Field, Form, Icon, Image, NavBar, Tab, Tabs, Tabbar, TabbarItem,
  Card, Tag, Search, Skeleton, Swipe, SwipeItem, List, Cell, CellGroup,
  Dialog, Toast, Popup, Uploader, ActionSheet, Picker, Checkbox, CheckboxGroup,
  Radio, RadioGroup, Stepper, SubmitBar, Empty, Loading, Badge, NoticeBar,
  PullRefresh, DropdownMenu, DropdownItem, ImagePreview, Overlay, Grid, GridItem,
  Divider, Progress, Rate, Steps, Step, SwipeCell, CountDown, Collapse, CollapseItem
]
vantComponents.forEach(comp => app.component(comp.name || '', comp))

app.use(Lazyload)
app.use(pinia)
app.use(router)
app.mount('#app')
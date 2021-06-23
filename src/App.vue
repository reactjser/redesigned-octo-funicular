<template>
  <div id="app">
    <button @click="showComp = !showComp" style="cursor: pointer">
      {{ showComp ? '关闭' : '开启' }}
    </button>
    <CascaderSelect v-if="showComp" :options="options" />
  </div>
</template>

<script>
import CascaderSelect from './components/cascader-select-panel.vue'
import { genMockData } from './components/mockData'

export default {
  name: 'App',
  components: {
    CascaderSelect,
  },
  data() {
    return {
      showComp: true,
      options: genMockData()
    }
  },
  watch: {
    showComp() {
      this.options = genMockData();
    }
  }
}
</script>

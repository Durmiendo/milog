import { h } from 'vue' // Импортируем функцию h
import DefaultTheme from 'vitepress/theme'
import './custom.css'
import Layout from './Layout.vue'
import LogicElement from "../../logic/components/blocks/LogicElement.vue";
import LogicProcessor from "../../logic/LogicProcessor.vue";
import ProgressMap from "../../logic/components/ProgressMap.vue";

export default {
    extends: DefaultTheme,
    Layout: Layout,
    enhanceApp({ app }) {
        app.component('LogicElement', LogicElement)
        app.component('Proc', LogicProcessor)
        app.component('ProgressMap', ProgressMap)

        // Создаем физический элемент <world> в DOM без использования строки template
        app.component('World', (props, { slots }) => {
            return h('world', {}, slots.default ? slots.default() : null)
        })
    }
}
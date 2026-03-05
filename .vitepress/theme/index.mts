import DefaultTheme from 'vitepress/theme'
import './custom.css'
import Layout from './Layout.vue'
import LogicElement from "../../logic/LogicElement.vue";
import LogicProcessor from "../../logic/LogicProcessor.vue";

export default {
    extends: DefaultTheme,
    Layout: Layout,
    enhanceApp({ app }) {
        app.component('LogicElement', LogicElement)
        app.component('Proc', LogicProcessor)
    }
}
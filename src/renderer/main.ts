import { createApp } from 'vue'
import './style.css';
import App from './App.vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'

const app = createApp(App);
const vuetify = createVuetify({
    components,
    theme: {
        defaultTheme: 'dark',
    }
});

app.use(vuetify);

app.mount('#app');


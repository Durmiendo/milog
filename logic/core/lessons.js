export const chapters = [
    {
        id: 'ch0',
        title: 'Глава 0. Устройство процессора',
        link: '/guide/ch0/',
        goal: 'Понять, как процессор исполняет код: строка, переменная, счётчик, переход, цикл.',
        lessons: [
            {id: 'ch0-run', title: 'Первый запуск', link: '/guide/ch0/run'},
            {id: 'ch0-vars', title: 'Переменные и set', link: '/guide/ch0/vars'},
            {id: 'ch0-op', title: 'Операции op', link: '/guide/ch0/op'},
            {id: 'ch0-counter', title: 'Счётчик @counter', link: '/guide/ch0/counter'},
            {id: 'ch0-jump', title: 'Переход jump', link: '/guide/ch0/jump'},
            {id: 'ch0-loop', title: 'Цикл', link: '/guide/ch0/loop'}
        ]
    },
    {
        id: 'ch1',
        title: 'Глава 1. Первые задачи',
        link: '/guide/ch1/',
        goal: 'Связать процессор с блоками: вывод текста, память, датчики, управление, дисплей.',
        lessons: [
            {id: 'ch1-message', title: 'Вывод в блок сообщений', link: '/guide/ch1/message'},
            {id: 'ch1-format', title: 'Шаблон строки format', link: '/guide/ch1/format'},
            {id: 'ch1-memory', title: 'Память cell1', link: '/guide/ch1/memory'},
            {id: 'ch1-switch', title: 'Датчик и управление', link: '/guide/ch1/switch'},
            {id: 'ch1-display', title: 'Дисплей', link: '/guide/ch1/display'},
            {id: 'ch1-indicator', title: 'Итог, индикатор заряда', link: '/guide/ch1/indicator'}
        ]
    }
]

export const findLesson = (id) => {
    for (const chapter of chapters) {
        const lesson = chapter.lessons.find(l => l.id === id)
        if (lesson) return {chapter, lesson}
    }
    return null
}

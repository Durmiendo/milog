import {ref, computed} from 'vue'

export function useLogicCanvas(core, containerRef, multiDragImageRef) {
    const itemRefs = new Map()
    const connectionPaths = ref([])
    const containerHeight = ref(0)
    const hoveredIndex = ref(null)

    const isDragging = ref(false)
    const primaryDragId = ref(null)
    let isMultiDrag = false
    let selectedItemsOrderOnDragStart = []
    let justDropped = false
    let dndRafId = null

    const setItemRef = (el, id) => el ? itemRefs.set(id, el) : itemRefs.delete(id)

    const arrowDrag = ref({
        isDragging: false, sourceIds: [], x: 0, y: 0, hoveredItemId: null
    })
    let blockRectsCache = []

    const updateLines = () => {
        if (!containerRef.value) return
        const offsets = new Map()
        let maxBottom = 0
        const containerRect = containerRef.value.getBoundingClientRect()

        for (const [id, el] of itemRefs.entries()) {
            if (el) {
                const rect = el.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    const top = rect.top - containerRect.top + containerRef.value.scrollTop
                    const left = rect.left - containerRect.left + containerRef.value.scrollLeft
                    offsets.set(id, { top, left, width: rect.width, height: rect.height })
                    maxBottom = Math.max(maxBottom, top + rect.height)
                }
            }
        }

        const groups = new Map()

        core.items.value.forEach((item, index) => {
            if (item.command === 'jump' || (arrowDrag.value.isDragging && arrowDrag.value.sourceIds.includes(item.id))) {

                let targetId = null

                if (arrowDrag.value.isDragging && arrowDrag.value.sourceIds.includes(item.id)) {
                    targetId = '__dragging__'
                } else {
                    const destStr = String(item.jumpDest).trim()
                    const targetFlatBlock = core.flatCodeInfo.value.flat.find((f, fIdx) => {
                        if (f.command === 'label' && f.params[0].value === destStr) return true
                        if (fIdx === parseInt(destStr)) return true
                        return false
                    })

                    if (targetFlatBlock) {
                        targetId = targetFlatBlock.id
                    }
                }

                if (targetId) {
                    let displayTargetId = targetId

                    if (displayTargetId !== '__dragging__' && !offsets.has(displayTargetId)) {
                        const flatEntry = core.flatCodeInfo.value.flat.find(f => f.id === displayTargetId)
                        if (flatEntry && flatEntry._parentId) {
                            displayTargetId = flatEntry._parentId
                        }
                    }

                    if (displayTargetId === '__dragging__' || offsets.has(displayTargetId)) {
                        if (!groups.has(displayTargetId)) {
                            groups.set(displayTargetId, {
                                targetId: displayTargetId,
                                sources: []
                            })
                        }
                        groups.get(displayTargetId).sources.push({ id: item.id, index })
                    }
                }
            }
        })

        const lanes = []
        connectionPaths.value = Array.from(groups.values()).map(group => {
            const isDragGroup = group.targetId === '__dragging__'

            const firstSource = group.sources[0]
            const sourceOff = offsets.get(firstSource.id)
            if (!sourceOff) return null

            const blockRightEdge = sourceOff.left + sourceOff.width

            const sourceYs = group.sources.map(s => {
                const off = offsets.get(s.id)
                return off ? off.top + (off.height / 2) : 0
            })

            let targetY, targetX
            if (isDragGroup) {
                targetY = arrowDrag.value.y
                targetX = arrowDrag.value.x
            } else {
                const tOff = offsets.get(group.targetId)
                if (!tOff) return null
                targetY = tOff.top + (tOff.height / 2)
                const isSubBlock = group.targetId.includes('_sub_')
                targetX = tOff.left + tOff.width + (isSubBlock ? -6 : 8)
            }

            const minY = Math.min(targetY, ...sourceYs)
            const maxY = Math.max(targetY, ...sourceYs)

            let laneIndex = 0
            if (!isDragGroup) {
                while (lanes[laneIndex]?.some(r => minY <= r.max && maxY >= r.min)) laneIndex++
                if (!lanes[laneIndex]) lanes[laneIndex] = []
                lanes[laneIndex].push({ min: minY, max: maxY })
            }

            const laneX = blockRightEdge + 30 + (laneIndex * 15)

            let d = group.sources.reduce((acc, source) => {
                const sOff = offsets.get(source.id)
                if (!sOff) return acc
                const sY = sOff.top + (sOff.height / 2)
                return acc + `M ${sOff.left + sOff.width} ${sY} L ${laneX} ${sY} `
            }, "")

            d += `M ${laneX} ${minY} L ${laneX} ${maxY} M ${laneX} ${targetY} L ${targetX} ${targetY}`

            // Проверяем, заблокировано ли редактирование у любого из источников связи
            const isEditLocked = group.sources.some(s => {
                const item = core.items.value.find(i => i.id === s.id)
                return item && (item.lockEdit || core.isCodeLocked.value)
            })

            return {
                d,
                targetId: group.targetId,
                sources: group.sources.map(s => s.flatIndex),
                sourceIds: group.sources.map(s => s.id),
                endX: targetX,
                endY: targetY,
                isDragging: isDragGroup,
                isEditLocked: isEditLocked
            }
        }).filter(Boolean)

        containerHeight.value = maxBottom + 100
    }

    const activePathIds = computed(() => {
        const activeSet = new Set()
        if (hoveredIndex.value === null) return activeSet
        connectionPaths.value.forEach((path, i) => {
            if (path.sources.includes(hoveredIndex.value)) activeSet.add(i)
        })
        return activeSet
    })

    const startArrowDrag = (e, path) => {
        if (path.isEditLocked) return

        arrowDrag.value.isDragging = true;
        arrowDrag.value.sourceIds = path.sourceIds
        const rect = containerRef.value.getBoundingClientRect()
        arrowDrag.value.x = e.clientX - rect.left;
        arrowDrag.value.y = e.clientY - rect.top

        blockRectsCache = Array.from(itemRefs.entries()).map(([id, el]) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {id, rect: r, area: r.width * r.height}
        }).filter(Boolean).sort((a, b) => a.area - b.area)

        window.addEventListener('pointermove', onArrowDragMove)
        window.addEventListener('pointerup', onArrowDragEnd)
        updateLines()
    }

    const onArrowDragMove = (e) => {
        if (!arrowDrag.value.isDragging) return
        const rect = containerRef.value.getBoundingClientRect()
        arrowDrag.value.x = e.clientX - rect.left;
        arrowDrag.value.y = e.clientY - rect.top
        arrowDrag.value.hoveredItemId = blockRectsCache.find(c => e.clientX >= c.rect.left && e.clientX <= c.rect.right && e.clientY >= c.rect.top && e.clientY <= c.rect.bottom)?.id || null
        updateLines()
    }

    const onArrowDragEnd = () => {
        window.removeEventListener('pointermove', onArrowDragMove)
        window.removeEventListener('pointerup', onArrowDragEnd)

        if (arrowDrag.value.hoveredItemId) {
            const targetFlatIndex = core.flatCodeInfo.value.flat.findIndex(f => f.id === arrowDrag.value.hoveredItemId)

            if (targetFlatIndex !== -1) {
                const targetFlat = core.flatCodeInfo.value.flat[targetFlatIndex]

                core.items.value.forEach(item => {
                    if (arrowDrag.value.sourceIds.includes(item.id)) {
                        item._targetId = targetFlat.id
                        item.jumpDest = targetFlat.command === 'label' ? targetFlat.params[0].value : targetFlatIndex
                    }
                })
            }
        }
        arrowDrag.value.isDragging = false;
        arrowDrag.value.sourceIds = [];
        arrowDrag.value.hoveredItemId = null
        updateLines()
    }

    const onListChange = (evt) => {
        if (evt?.moved && isMultiDrag) {
            const {newIndex} = evt.moved
            const remainingItems = core.items.value.filter(i => !core.selectedIds.value.has(i.id))
            const nextUnselected = core.items.value.slice(newIndex + 1).find(i => !core.selectedIds.value.has(i.id))
            const insertIndex = nextUnselected ? remainingItems.findIndex(i => i.id === nextUnselected.id) : remainingItems.length
            remainingItems.splice(insertIndex, 0, ...selectedItemsOrderOnDragStart)
            core.items.value = remainingItems
            isMultiDrag = false
        }

        core.items.value.forEach((item) => {
            if (item.command === 'jump' && item._targetId) {
                const targetFlatIndex = core.flatCodeInfo.value.flat.findIndex(f => f.id === item._targetId)
                if (targetFlatIndex !== -1) {
                    const targetFlat = core.flatCodeInfo.value.flat[targetFlatIndex]
                    item.jumpDest = targetFlat.command === 'label' ? targetFlat.params[0].value : targetFlatIndex
                } else item._targetId = null
            }
        })
        updateLines()
    }

    const onDragStart = (evt) => {
        isDragging.value = true
        const draggedEl = core.items.value[evt.oldIndex]
        if (draggedEl) {
            if (core.selectedIds.value.has(draggedEl.id) && core.selectedIds.value.size > 1) {
                isMultiDrag = true;
                primaryDragId.value = draggedEl.id;
                selectedItemsOrderOnDragStart = core.items.value.filter(i => core.selectedIds.value.has(i.id))
                core.selectedIds.value.forEach(id => {
                    if (id !== draggedEl.id) itemRefs.get(id)?.style.setProperty('display', 'none')
                })
            } else {
                core.selectedIds.value.clear();
                core.selectedIds.value.add(draggedEl.id);
                core.lastSelectedId = draggedEl.id
                isMultiDrag = false;
                primaryDragId.value = draggedEl.id
            }
        }
        const loop = () => {
            updateLines();
            if (isDragging.value) dndRafId = requestAnimationFrame(loop)
        }
        dndRafId = requestAnimationFrame(loop)
    }

    const onDragEnd = () => {
        isDragging.value = false
        core.selectedIds.value.forEach(id => itemRefs.get(id)?.style.setProperty('display', ''))
        isMultiDrag = false;
        primaryDragId.value = null;
        cancelAnimationFrame(dndRafId)
        justDropped = true;
        setTimeout(() => justDropped = false, 150)
        setTimeout(updateLines, 1)
    }

    const onSetData = (dataTransfer, dragEl) => {
    }

    return {
        itemRefs,
        connectionPaths,
        containerHeight,
        hoveredIndex,
        isDragging,
        arrowDrag,
        activePathIds,
        justDropped,
        setItemRef,
        updateLines,
        startArrowDrag,
        onDragStart,
        onDragEnd,
        onListChange,
        onSetData
    }
}
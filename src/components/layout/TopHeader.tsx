// filepath: src/components/layout/TopHeader.tsx
import { useRef, useState, type ChangeEvent } from 'react'
import html2canvas from 'html2canvas'
import { useCellStore } from '../../store/useCellStore'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export default function TopHeader({ onReset }: { onReset: () => void }) {
  const cells = useCellStore((state) => state.cells)
  const selected = useCellStore((state) => state.selectedCellIds)
  const name = useCellStore((state) => state.datasetName)
  const bookmark = useCellStore((state) => state.applyBookmark)
  const reset = useCellStore((state) => state.resetView)
  const importCells = useCellStore((state) => state.importCells)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  function exportCsv() {
    const headers = ['id', 'cluster', 'spatialX', 'spatialY', 'umapX', 'umapY', 'pseudotime', 'velocityU', 'velocityV', 'Sox9', 'Neurog3', 'Ins1', 'Gcg']
    const rows = cells.filter((cell) => !selected.size || selected.has(cell.id)).map((cell) =>
      [cell.id, cell.cluster, cell.spatialX, cell.spatialY, cell.umapX, cell.umapY, cell.pseudotime,
        cell.velocityU, cell.velocityV, cell.genes.Sox9, cell.genes.Neurog3, cell.genes.Ins1, cell.genes.Gcg]
        .map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(','),
    )
    download(new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'cellflow_cells.csv')
  }

  async function loadJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      importCells(JSON.parse(await file.text()), file.name)
      onReset()
      setMessage('数据导入成功')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  async function snapshot() {
    setBusy(true)
    setMessage('')
    try {
      const target = document.querySelector('main')
      if (!target) throw new Error('工作区尚未就绪')
      const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#F8FAFC', logging: false })
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('PNG 编码失败')), 'image/png',
      ))
      download(blob, 'cellflow_snapshot.png')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '快照导出失败')
    } finally {
      setBusy(false)
    }
  }

  const button = 'rounded-full border border-lab-line px-2 py-1 text-xs hover:bg-lab-canvas disabled:opacity-50'
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-lab-line bg-white px-3 py-2">
      <h1 className="text-sm font-semibold">CellFlow Canvas</h1>
      <span className="max-w-48 truncate rounded-full bg-lab-canvas px-2 py-1 text-xs text-lab-muted" title={name}>{name}</span>
      <dl className="flex gap-3 text-xs">
        <div className="flex gap-1"><dt>总细胞数</dt><dd>{cells.length.toLocaleString('zh-CN')}</dd></div>
        <div className="flex gap-1"><dt>选中细胞数</dt><dd>{selected.size.toLocaleString('zh-CN')}</dd></div>
      </dl>
      <nav aria-label="Quick Discovery Bookmarks" className="flex flex-wrap gap-1">
        <button className={button} type="button" disabled={busy} title="Bifurcation Zone" onClick={() => bookmark('bifurcation')}>🎯 内分泌前体分叉口</button>
        <button className={button} type="button" disabled={busy} title="Beta Core" onClick={() => bookmark('beta')}>🩸 胰岛核心 Beta 簇</button>
        <button className={button} type="button" disabled={busy} title="Full Manifold" onClick={() => { bookmark('full'); onReset() }}>🌊 全局流场总览</button>
      </nav>
      <div className="ml-auto flex flex-wrap gap-1">
        <button className={button} type="button" disabled={busy} onClick={() => { reset(); onReset() }}>视图复位</button>
        <button className={button} type="button" disabled={busy} onClick={snapshot}>导出快照</button>
        <details className="relative text-xs">
          <summary className={button}>数据导出 / 导入</summary>
          <div className="absolute right-0 z-50 grid w-44 gap-1 rounded border border-lab-line bg-white p-2 shadow-lab">
            <button className={button} type="button" disabled={busy} onClick={exportCsv}>导出选中细胞 CSV</button>
            <button className={button} type="button" disabled={busy} onClick={() => input.current?.click()}>导入自定义 JSON</button>
          </div>
        </details>
      </div>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={loadJson} />
      {message && <p role="status" className="w-full text-xs text-lab-muted">{message}</p>}
    </header>
  )
}

/**
 * Settings, and everything to do with the data itself.
 *
 * The privacy position is not a toggle buried in here — it is the
 * architecture. There is no account, no server and no analytics. Export exists
 * so the record is portable and the user is never locked in; import exists so
 * a device can be replaced. Both move a file the user controls.
 */
import { useEffect, useState } from 'react'
import type { ThemePref } from '../db/schema'
import { useStore } from '../store'
import * as db from '../db/db'
import { SAMPLE_PREFIX, buildSampleData, isSampleEntry } from '../lib/seed'
import { formatBytes } from '../lib/image'
import { AppBar, Alert, Card, NumberField, Segmented, Spinner, SwitchRow } from '../components/ui'
import { IconDownload, IconLock, IconTrash, IconUpload } from '../components/icons'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function Settings() {
  const { settings, saveSettings, stool, food, reload, toast } = useStore()
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const hasSample = stool.some((e) => isSampleEntry(e.id)) || food.some((e) => isSampleEntry(e.id))

  useEffect(() => {
    void db.estimateUsage().then(setUsage)
  }, [stool.length, food.length])

  async function handleExport(includePhotos: boolean) {
    setBusy(true)
    try {
      const bundle = await db.exportAll(includePhotos)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stool-journal-${new Date().toISOString().slice(0, 10)}${includePhotos ? '-with-photos' : ''}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      toast('Export downloaded')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File) {
    setBusy(true)
    try {
      const result = await db.importAll(JSON.parse(await file.text()))
      await reload()
      toast(`Imported ${result.stool} entries and ${result.food} meals`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That file could not be imported')
    } finally {
      setBusy(false)
    }
  }

  async function handleSample() {
    setBusy(true)
    try {
      const sample = buildSampleData()
      for (const e of sample.stool) await db.putStool(e)
      for (const e of sample.food) await db.putFood(e)
      await reload()
      toast('Sample data added')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add the sample')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveSample() {
    setBusy(true)
    try {
      const removed = await db.removeSampleData(SAMPLE_PREFIX)
      await reload()
      toast(removed > 0 ? `Removed ${removed} sample entries` : 'No sample data to remove')
    } finally {
      setBusy(false)
    }
  }

  async function handleWipe() {
    const ok = window.confirm(
      'Delete everything?\n\nEvery entry and every photograph will be permanently erased from this device. There is no copy anywhere else, so this cannot be undone. Export first if you want to keep it.',
    )
    if (!ok) return
    if (window.prompt('Type DELETE to confirm.') !== 'DELETE') {
      toast('Nothing was deleted')
      return
    }
    setBusy(true)
    try {
      await db.wipeAll()
      await reload()
      toast('All data deleted')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppBar title="Settings" />
      <main className="main">
        <div className="stack">
          <Card title="You">
            <NumberField
              label="Body weight"
              hint="Optional, and the only number here. It turns “you lost a lot of fluid today” into an amount worth drinking — a bad day costs a smaller person proportionally more. Leave it blank and a general figure is used instead."
              value={settings.bodyWeightLb}
              onChange={(v) => void saveSettings({ bodyWeightLb: v })}
              suffix="lb"
              step={1}
              placeholder="optional"
            />
          </Card>

          <Card title="Appearance">
            <Segmented
              options={THEMES}
              value={settings.theme}
              onChange={(v) => void saveSettings({ theme: v })}
            />
          </Card>

          <Card title="Privacy">
            <div className="stack">
              <SwitchRow
                label="Allow photographs"
                hint="Photographs are stored on this device only, blurred until tapped, and location data is stripped before saving."
                checked={settings.photosEnabled}
                onChange={(v) => void saveSettings({ photosEnabled: v })}
              />
              <SwitchRow
                label="Show red-flag notes"
                hint="Points out findings — blood, prolonged diarrhoea, unintended weight loss — that are worth a doctor's attention."
                checked={settings.redFlagAlerts}
                onChange={(v) => void saveSettings({ redFlagAlerts: v })}
              />
              <Alert tone="info" title="Where your data lives">
                Everything is stored in this browser on this device. There is no account, no server
                and nothing is uploaded — this app makes no network requests at all after it loads.
                That also means there is no backup but the one you export yourself, and clearing
                this browser's site data erases the journal.
              </Alert>
            </div>
          </Card>

          <Card
            title="Your data"
            subtitle={
              usage
                ? `${stool.length} entries and ${food.length} meals, using ${formatBytes(usage.usage)}.`
                : `${stool.length} entries and ${food.length} meals.`
            }
          >
            <div className="stack stack--tight">
              <button
                className="btn btn--secondary btn--block"
                onClick={() => handleExport(false)}
                disabled={busy}
              >
                {busy ? <Spinner /> : <IconDownload />}
                Export entries
              </button>
              <button
                className="btn btn--secondary btn--block"
                onClick={() => handleExport(true)}
                disabled={busy}
              >
                {busy ? <Spinner /> : <IconDownload />}
                Export entries and photographs
              </button>
              <p className="field__hint">
                <IconLock style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> An export with
                photographs is a plain, unencrypted file. Once it leaves this app you are
                responsible for where it goes — do not email it to yourself or drop it in a shared
                folder.
              </p>

              <label className="btn btn--secondary btn--block" style={{ cursor: 'pointer' }}>
                {busy ? <Spinner /> : <IconUpload />}
                Import a previous export
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleImport(file)
                    e.target.value = ''
                  }}
                />
              </label>
              <p className="field__hint">
                Merges by entry, so importing the same file twice will not duplicate anything.
              </p>
            </div>
          </Card>

          <Card
            title="Sample data"
            subtitle="Two weeks of made-up entries so you can see what the calendar and the patterns screen look like before you have any of your own."
          >
            <div className="stack stack--tight">
              <button className="btn btn--secondary btn--block" onClick={handleSample} disabled={busy}>
                {busy ? <Spinner /> : null}
                Add sample data
              </button>
              {hasSample && (
                <button
                  className="btn btn--secondary btn--block"
                  onClick={handleRemoveSample}
                  disabled={busy}
                >
                  {busy ? <Spinner /> : null}
                  Remove sample data
                </button>
              )}
              <p className="field__hint">
                It is clearly fake and removing it only touches the sample — your own entries are
                never affected.
              </p>
            </div>
          </Card>

          <Card title="Danger zone">
            <button className="btn btn--danger btn--block" onClick={handleWipe} disabled={busy}>
              {busy ? <Spinner /> : <IconTrash />}
              Delete everything on this device
            </button>
          </Card>

          <Card title="About">
            <div className="stack stack--tight">
              <p className="small">
                A poop journal. It records what happened and when, notices what tends to come
                before a bad one, and prints something you can hand to a doctor. That is all it
                does, on purpose.
              </p>
              <p className="small muted">
                It is not a medical device and cannot diagnose anything. If something in here worries
                you, that is a reason to see a doctor, not to read further into the app.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

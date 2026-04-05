import puppeteer from 'puppeteer'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'screenshots')
const BASE = 'http://localhost:5174'

await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })

// Enter demo mode
await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle0' })
await page.waitForSelector('button')
const demoBtn = await page.$x?.("//button[contains(text(), 'demonstra')]") ??
  await page.$$eval('button', btns => {
    const b = btns.find(b => b.textContent.includes('demonstra'))
    b?.click()
    return !!b
  })
if (Array.isArray(demoBtn) && demoBtn[0]) await demoBtn[0].click()
await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})

// Login screenshot (go back)
await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle0' })
await page.waitForSelector('button')
await page.screenshot({ path: path.join(OUT, '01-login.png') })
console.log('✓ 01-login.png')

// Re-enter demo
await page.$$eval('button', btns => {
  const b = btns.find(b => b.textContent.includes('demonstra'))
  b?.click()
})
await new Promise(r => setTimeout(r, 1000))

const modules = [
  { hash: 'prestacoes', file: '02-prestacoes.jpg' },
  { hash: 'discursos',  file: '03-discursos.jpg'  },
  { hash: 'projetos',   file: '04-projetos.jpg'   },
  { hash: 'orientacoes',file: '05-orientacoes.jpg'},
  { hash: 'nucleacao',  file: '06-nucleacao.jpg'  },
  { hash: 'producao',   file: '07-producao.jpg'   },
  { hash: 'internacionalizacao', file: '08-internacionalizacao.jpg' },
]

for (const { hash, file } of modules) {
  await page.goto(`${BASE}/#/${hash}`, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({
    path: path.join(OUT, file),
    type: file.endsWith('.jpg') ? 'jpeg' : 'png',
    quality: file.endsWith('.jpg') ? 90 : undefined,
  })
  console.log(`✓ ${file}`)
}

await browser.close()
console.log('Todos os screenshots salvos em screenshots/')

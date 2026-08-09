import './globals.css'
import ProductImageHydrator from '../components/product-image-hydrator'

export const metadata = {
  title: 'Preço Radar',
  description: 'Radar inteligente de preços, histórico e cupons validados.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        {children}
        <ProductImageHydrator />
      </body>
    </html>
  )
}

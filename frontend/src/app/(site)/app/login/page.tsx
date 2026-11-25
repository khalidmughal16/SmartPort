import { Auth } from '../../../../components/Auth'
export default function Page({ searchParams }: { searchParams: { as?: string } }) {
  const as = searchParams?.as === 'control-room' ? 'Control room' : searchParams?.as === 'client-portal' ? 'Client portal' : undefined
  return <Auth signup={false} as={as} />
}

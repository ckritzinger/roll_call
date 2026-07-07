export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    token: config.powerSyncToken,
    endpoint: config.public.powerSyncUrl,
  }
})

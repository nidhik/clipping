// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default (req, res) => {
  console.log(process.env.MUX_TOKEN_ID)
  console.log(process.env.MUX_TOKEN_SECRET)
  res.status(200).json({ name: 'John Doe' })
}

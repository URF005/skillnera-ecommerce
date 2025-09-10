'use client'
import ButtonLoading from '@/components/Application/ButtonLoading'
import UserPanelLayout from '@/components/Application/Website/UserPanelLayout'
import WebsiteBreadcrumb from '@/components/Application/Website/WebsiteBreadcrumb'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import useFetch from '@/hooks/useFetch'
import { zSchema } from '@/lib/zodSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Dropzone from 'react-dropzone'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import userIcon from '@/public/assets/images/user.png'
import { FaCamera } from "react-icons/fa";
import { showToast } from '@/lib/showToast'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { login } from '@/store/reducer/authReducer'

const breadCrumbData = {
  title: 'Profile',
  links: [{ label: 'Profile' }]
}

const Profile = () => {
  const dispatch = useDispatch()
  const { data: user } = useFetch('/api/profile/get')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState()
  const [file, setFile] = useState()

  // ===== Rewards state =====
  const [rewards, setRewards] = useState(null)
  const [rwLoading, setRwLoading] = useState(true)
  // =========================

  const formSchema = zSchema.pick({
    name: true, phone: true, address: true
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
    }
  })

  useEffect(() => {
    if (user && user.success) {
      const userData = user.data
      form.reset({
        name: userData?.name,
        phone: userData?.phone,
        address: userData?.address,
      })
      setPreview(userData?.avatar?.url)
    }
  }, [user])

  // Load rewards/commissions
  useEffect(() => {
    (async () => {
      try {
        setRwLoading(true)
        const res = await fetch('/api/mlm/my-commissions', { cache: 'no-store' })
        const data = await res.json()
        if (data?.success) setRewards(data.data)
      } catch (e) {
        // silent fail, keep page usable
      } finally {
        setRwLoading(false)
      }
    })()
  }, [])

  const handleFileSelection = (files) => {
    const file = files[0]
    const preview = URL.createObjectURL(file)
    setPreview(preview)
    setFile(file)
  }

  const updateProfile = async (values) => {
    setLoading(true)
    try {
      let formData = new FormData()
      if (file) formData.set('file', file)
      formData.set('name', values.name)
      formData.set('phone', values.phone)
      formData.set('address', values.address)

      const { data: response } = await axios.put('/api/profile/update', formData)
      if (!response.success) throw new Error(response.message)

      showToast('success', response.message)
      dispatch(login(response.data))
    } catch (error) {
      showToast('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  // ===== Referral helpers =====
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BASE_URL || '')
  const referralCode = user?.success ? user?.data?.referralCode : ''
  const shareLink = referralCode ? `${origin}/?ref=${referralCode}` : ''

  const copyLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      showToast('success', 'Referral link copied!')
    } catch (e) {
      showToast('error', 'Failed to copy link')
    }
  }
  // ============================

  const fmt = (n) => Number(n || 0).toFixed(2)

  return (
    <div>
      <WebsiteBreadcrumb props={breadCrumbData} />
      <UserPanelLayout>
        {/* Profile Card */}
        <div className='shadow rounded'>
          <div className='p-5 text-xl font-semibold border-b'>Profile</div>
          <div className='p-5'>
            <Form {...form}>
              <form className='grid md:grid-cols-2 grid-cols-1 gap-5' onSubmit={form.handleSubmit(updateProfile)} >
                <div className='md:col-span-2 col-span-1 flex justify-center items-center'>
                  <Dropzone onDrop={acceptedFiles => handleFileSelection(acceptedFiles)}>
                    {({ getRootProps, getInputProps }) => (
                      <div {...getRootProps()}>
                        <input {...getInputProps()} />
                        <Avatar className="w-28 h-28 relative group border border-gray-100">
                          <AvatarImage src={preview ? preview : userIcon.src} />
                          <div className='absolute z-50 w-full h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 justify-center items-center border-2 border-violet-500 rounded-full group-hover:flex hidden cursor-pointer bg-black/20'>
                            <FaCamera color='#7c3aed' />
                          </div>
                        </Avatar>
                      </div>
                    )}
                  </Dropzone>
                </div>

                <div className='mb-3'>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='mb-3'>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"                 // was "number" — use tel so 03… stays intact
                            placeholder="03XXXXXXXXX"  // Pakistani mobile format
                            autoComplete="tel"
                            inputMode="numeric"
                            {...field}
                          />
                        </FormControl>

                        {/* Warning hint */}
                        <div className="text-xs text-amber-600 mt-1">
                          ⚠️ Use the number registered with Easypaisa or JazzCash for payouts.
                        </div>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


                <div className='mb-3 md:col-span-2 col-span-1'>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter your address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='mb-3 md:col-span-2 col-span-1'>
                  <ButtonLoading loading={loading} type="submit" text="Save Changes" className="cursor-pointer" />
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Referral Card */}
        <div className='shadow rounded mt-6'>
          <div className='p-5 text-xl font-semibold border-b'>Referral</div>
          <div className='p-5 space-y-2'>
            <div className='text-sm'>
              Your code:&nbsp;
              <b className='font-mono tracking-wider'>
                {referralCode || '-'}
              </b>
            </div>

            {referralCode && (
              <>
                <div className='text-sm break-all'>
                  Share link:&nbsp;
                  <a className='text-blue-600 underline' href={shareLink}>
                    {shareLink}
                  </a>
                </div>
                <button type='button' onClick={copyLink} className='mt-2 border rounded px-3 py-1'>
                  Copy link
                </button>
              </>
            )}

            {user?.data?.referredBy && (
              <div className='text-xs opacity-70'>
                You joined via a referral{user?.data?.referredAt ? ` on ${new Date(user.data.referredAt).toLocaleDateString()}` : ''}.
              </div>
            )}
          </div>
        </div>

        {/* Rewards / Gift Card */}
        <div className='mt-6'>
          <div className='rounded-2xl overflow-hidden shadow'>
            <div className='p-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-sm uppercase tracking-widest opacity-90'>Rewards Card</div>
                  <div className='text-2xl font-semibold mt-1'>Total Earned</div>
                </div>
                <div className='text-right'>
                  <div className='text-3xl font-bold'>
                    {rwLoading ? '—' : fmt(rewards?.totals?.paidAmount)}
                  </div>
                  <div className='text-xs opacity-90'>Paid to you</div>
                </div>
              </div>
              <div className='flex gap-3 mt-4 flex-wrap'>
                <span className='bg-white/20 px-3 py-1 rounded-full text-sm'>
                  Pending: {rwLoading ? '—' : fmt(rewards?.totals?.pendingAmount)}
                </span>
                <span className='bg-white/20 px-3 py-1 rounded-full text-sm'>
                  Approved: {rwLoading ? '—' : fmt(rewards?.totals?.approvedAmount)}
                </span>
                <span className='bg-white/20 px-3 py-1 rounded-full text-sm'>
                  Void: {rwLoading ? '—' : fmt(rewards?.totals?.voidAmount)}
                </span>
              </div>
            </div>

            <div className='p-5 bg-white'>
              <div className='font-medium mb-2'>Recent rewards</div>
              <div className='overflow-auto rounded border'>
                <table className='min-w-full text-sm'>
                  <thead className='bg-muted'>
                    <tr>
                      <th className='p-3 text-left'>Date</th>
                      <th className='p-3 text-left'>Order</th>
                      <th className='p-3 text-left'>Buyer</th>
                      <th className='p-3 text-left'>Level</th>
                      <th className='p-3 text-left'>Amount</th>
                      <th className='p-3 text-left'>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rwLoading ? (
                      <tr><td className='p-3' colSpan={6}>Loading…</td></tr>
                    ) : (rewards?.recent || []).length === 0 ? (
                      <tr><td className='p-3' colSpan={6}>No rewards yet</td></tr>
                    ) : (
                      rewards.recent.map((r) => (
                        <tr key={r._id} className='border-t'>
                          <td className='p-3'>{new Date(r.createdAt).toLocaleString()}</td>
                          <td className='p-3'>{r.order?.order_id || r.order?._id}</td>
                          <td className='p-3'>{r.buyer?.name} ({r.buyer?.email})</td>
                          <td className='p-3'>{r.level}</td>
                          <td className='p-3 font-semibold'>{fmt(r.amount)}</td>
                          <td className='p-3'>{r.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className='text-xs opacity-70 mt-3'>
                * “Paid” reflects commissions you’ve already received. “Approved” are queued for next payout.
              </div>
            </div>
          </div>
        </div>
      </UserPanelLayout>
    </div>
  )
}

export default Profile

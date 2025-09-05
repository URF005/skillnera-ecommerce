'use client'
import ButtonLoading from '@/components/Application/ButtonLoading'
import WebsiteBreadcrumb from '@/components/Application/Website/WebsiteBreadcrumb'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import useFetch from '@/hooks/useFetch'
import { showToast } from '@/lib/showToast'
import { zSchema } from '@/lib/zodSchema'
import { WEBSITE_ORDER_DETAILS, WEBSITE_PRODUCT_DETAILS, WEBSITE_SHOP } from '@/routes/WebsiteRoute'
import { addIntoCart, clearCart } from '@/store/reducer/cartReducer'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { IoCloseCircleSharp } from "react-icons/io5";
import { z } from 'zod'
import { FaShippingFast } from "react-icons/fa";
import { useRouter } from 'next/navigation'
import loading from '@/public/assets/images/loading.svg'

const breadCrumb = {
    title: 'Checkout',
    links: [
        { label: "Checkout" }
    ]
}

const Checkout = () => {
    const router = useRouter()
    const dispatch = useDispatch()
    const cart = useSelector(store => store.cartStore)
    const authStore = useSelector(store => store.authStore)
    const [verifiedCartData, setVerifiedCartData] = useState([])
    const { data: getVerifiedCartData } = useFetch('/api/cart-verification', 'POST', { data: cart.products })

    const [isCouponApplied, setIsCouponApplied] = useState(false)
    const [subtotal, setSubTotal] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [couponDiscountAmount, setCouponDiscountAmount] = useState(0)
    const [totalAmount, setTotalAmount] = useState(0)
    const [couponLoading, setCouponLoading] = useState(false)
    const [couponCode, setCouponCode] = useState('')
    const [placingOrder, setPlacingOrder] = useState(false)
    const [screenshot, setScreenshot] = useState(null)
    const [screenshotError, setScreenshotError] = useState('')

    useEffect(() => {
        if (getVerifiedCartData && getVerifiedCartData.success) {
            const cartData = getVerifiedCartData.data
            setVerifiedCartData(cartData)
            dispatch(clearCart())
            cartData.forEach(cartItem => {
                dispatch(addIntoCart(cartItem))
            });
        }
    }, [getVerifiedCartData])

    useEffect(() => {
        const cartProducts = cart.products
        const subTotalAmount = cartProducts.reduce((sum, product) => sum + (product.sellingPrice * product.qty), 0)
        const discount = cartProducts.reduce((sum, product) => sum + ((product.mrp - product.sellingPrice) * product.qty), 0)

        setSubTotal(subTotalAmount)
        setDiscount(discount)
        setTotalAmount(subTotalAmount)
        couponForm.setValue('minShoppingAmount', subTotalAmount)
    }, [cart])

    // Coupon form 
    const couponFormSchema = zSchema.pick({
        code: true,
        minShoppingAmount: true
    })

    const couponForm = useForm({
        resolver: zodResolver(couponFormSchema),
        defaultValues: {
            code: "",
            minShoppingAmount: subtotal
        }
    })

    const applyCoupon = async (values) => {
        setCouponLoading(true)
        try {
            const { data: response } = await axios.post('/api/coupon/apply', values)
            if (!response.success) {
                throw new Error(response.message)
            }
            const discountPercentage = response.data.discountPercentage
            setCouponDiscountAmount((subtotal * discountPercentage) / 100)
            setTotalAmount(subtotal - ((subtotal * discountPercentage) / 100))
            showToast('success', response.message)
            setCouponCode(couponForm.getValues('code'))
            setIsCouponApplied(true)
            couponForm.resetField('code', '')
        } catch (error) {
            showToast('error', error.message)
        } finally {
            setCouponLoading(false)
        }
    }

    const removeCoupon = () => {
        setIsCouponApplied(false)
        setCouponCode('')
        setCouponDiscountAmount(0)
        setTotalAmount(subtotal)
    }

    // Place order 
    const orderFormSchema = zSchema.pick({
        name: true,
        email: true,
        phone: true,
        country: true,
        state: true,
        city: true,
        pincode: true,
        landmark: true,
    }).extend({
        userId: z.string().optional()
    })

    const orderForm = useForm({
        resolver: zodResolver(orderFormSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            country: '',
            state: '',
            city: '',
            pincode: '',
            landmark: '',
            userId: authStore?.auth?._id,
        }
    })

    useEffect(() => {
        if (authStore) {
            orderForm.setValue('userId', authStore?.auth?._id)
        }
    }, [authStore])

    const placeOrder = async (formData) => {
        if (!screenshot) {
            setScreenshotError('Transaction screenshot is required')
            return
        }
        setScreenshotError('')
        setPlacingOrder(true)
        try {
            // Upload screenshot to Cloudinary
            const uploadForm = new FormData()
            uploadForm.append('file', screenshot)
            uploadForm.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)
            const uploadRes = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                uploadForm,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            )
            const url = uploadRes.data.secure_url

            const products = verifiedCartData.map((cartItem) => ({
                productId: cartItem.productId,
                variantId: cartItem.variantId,
                name: cartItem.name,
                qty: cartItem.qty,
                mrp: cartItem.mrp,
                sellingPrice: cartItem.sellingPrice,
            }))

            const orderData = {
                ...formData,
                ordernote: url,
                products: products,
                subtotal: subtotal,
                discount: discount,
                couponDiscountAmount: couponDiscountAmount,
                totalAmount: totalAmount
            }

            const { data: paymentResponseData } = await axios.post('/api/payment/save-order', orderData)

            if (paymentResponseData.success) {
                showToast('success', paymentResponseData.message)
                dispatch(clearCart())
                orderForm.reset()
                setScreenshot(null)
                router.push(WEBSITE_ORDER_DETAILS(paymentResponseData.data.order_id))
            } else {
                showToast('error', paymentResponseData.message)
            }
        } catch (error) {
            showToast('error', error.message)
        } finally {
            setPlacingOrder(false)
        }
    }

    return (
        <div>
            {placingOrder &&
                <div className='h-screen w-screen fixed top-0 left-0 z-50 bg-black/10'>
                    <div className='h-screen flex justify-center items-center'>
                        <Image src={loading.src} height={80} width={80} alt='Loading' />
                        <h4 className='font-semibold'>Order Confirming...</h4>
                    </div>
                </div>
            }

            <WebsiteBreadcrumb props={breadCrumb} />
            {cart.count === 0
                ?
                <div className='w-screen h-[500px] flex justify-center items-center py-32'>
                    <div className='text-center'>
                        <h4 className='text-4xl font-semibold mb-5'>Your cart is empty!</h4>
                        <Button type="button" asChild>
                            <Link href={WEBSITE_SHOP}>Continue Shopping</Link>
                        </Button>
                    </div>
                </div>
                :
                <div className='my-20 lg:px-32 px-4'>
                    {/* Payment Instructions Section */}
                    <div className='mb-10'>
                        <h3 className='text-xl font-semibold mb-4 flex items-center gap-2'>
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            Payment Instructions
                        </h3>
                        <div className='bg-gray-50 p-6 rounded-lg shadow-sm'>
                            <p className='text-sm text-gray-600 mb-4'>
                                Please make the payment using one of the methods below and upload a screenshot of the transaction confirmation.
                            </p>
                            <div className='grid lg:grid-cols-3 gap-6'>
                                <div className='bg-white p-4 rounded-md border border-gray-200 flex flex-col items-center'>
                                    <Image
                                        src="/assets/images/jazzcash.png"
                                        width={32}
                                        height={32}
                                        alt="JazzCash Logo"
                                        className='mb-2'
                                    />
                                    <h4 className='font-semibold text-violet-600'>JazzCash</h4>
                                    <p className='text-sm mt-2'>Account Number: <span className='font-mono'>0300-1234567</span></p>
                                    <p className='text-sm'>Account Holder: E-Store Payments</p>
                                </div>
                                <div className='bg-white p-4 rounded-md border border-gray-200 flex flex-col items-center'>
                                    <Image
                                        src="/assets/images/easypasa.png"
                                        width={32}
                                        height={32}
                                        alt="Easypaisa Logo"
                                        className='mb-2'
                                    />
                                    <h4 className='font-semibold text-violet-600'>Easypaisa</h4>
                                    <p className='text-sm mt-2'>Account Number: <span className='font-mono'>0345-7654321</span></p>
                                    <p className='text-sm'>Account Holder: E-Store Payments</p>
                                </div>
                                <div className='bg-white p-4 rounded-md border border-gray-200 flex flex-col items-center'>
                                    <Image
                                        src="/assets/images/bank.png"
                                        width={32}
                                        height={32}
                                        alt="Bank Logo"
                                        className='mb-2'
                                    />
                                    <h4 className='font-semibold text-violet-600'>Bank Account</h4>
                                    <p className='text-sm mt-2'>Bank: Habib Bank Limited</p>
                                    <p className='text-sm'>Account Number: <span className='font-mono'>1234-5678-9012-3456</span></p>
                                    <p className='text-sm'>IBAN: PK12HABB0001234567890123</p>
                                    <p className='text-sm'>Account Holder: E-Store Payments</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='flex lg:flex-nowrap flex-wrap gap-10'>
                        <div className='lg:w-[60%] w-full'>
                            <div className='flex font-semibold gap-2 items-center'>
                                <FaShippingFast size={25} /> Shipping Address:
                            </div>
                            <div className='mt-5'>
                                <Form {...orderForm}>
                                    <form className='grid grid-cols-2 gap-5' onSubmit={orderForm.handleSubmit(placeOrder)}>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='name'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Full name*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='email'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input type="email" placeholder="Email*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='phone'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Phone*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='country'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Country*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='state'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="State*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='city'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="City*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='pincode'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Pincode*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3'>
                                            <FormField
                                                control={orderForm.control}
                                                name='landmark'
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Address*" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className='mb-3 col-span-2'>
                                            <label htmlFor="screenshot" className='block mb-2'>Upload Transaction Screenshot* (JPEG/PNG, max 5MB)</label>
                                            <input
                                                type="file"
                                                id="screenshot"
                                                accept="image/jpeg,image/png"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) {
                                                        setScreenshotError('Please select a file.');
                                                        setScreenshot(null);
                                                        return;
                                                    }
                                                    if (!['image/jpeg', 'image/png'].includes(file.type)) {
                                                        setScreenshotError('Please upload a JPEG or PNG image.');
                                                        setScreenshot(null);
                                                        return;
                                                    }
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        setScreenshotError('File size must be less than 5MB.');
                                                        setScreenshot(null);
                                                        return;
                                                    }
                                                    setScreenshotError('');
                                                    setScreenshot(file);
                                                }}
                                                className="border rounded p-2 w-full"
                                            />
                                            {screenshotError && <p className='text-red-500 text-sm mt-1'>{screenshotError}</p>}
                                        </div>

                                        <div className='mb-3'>
                                            <ButtonLoading type="submit" text="Place Order" loading={placingOrder} className="bg-black rounded-full px-5 cursor-pointer" />
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        </div>
                        <div className='lg:w-[40%] w-full'>
                            <div className='rounded bg-gray-50 p-5 sticky top-5'>
                                <h4 className='text-lg font-semibold mb-5'>Order Summary</h4>
                                <div>
                                    <table className='w-full border'>
                                        <tbody>
                                            {verifiedCartData && verifiedCartData?.map(product => (
                                                <tr key={product.variantId}>
                                                    <td className='p-3'>
                                                        <div className='flex items-center gap-5'>
                                                            <Image src={product.media} width={60} height={60} alt={product.name} className='rounded' />
                                                            <div>
                                                                <h4 className='font-medium line-clamp-1'>
                                                                    <Link href={WEBSITE_PRODUCT_DETAILS(product.url)}>{product.name}</Link>
                                                                </h4>
                                                                <p className='text-sm'>Color: {product.color}</p>
                                                                <p className='text-sm'>Size: {product.size}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className='p-3 text-center'>
                                                        <p className='text-nowrap text-sm'>
                                                            {product.qty} x {product.sellingPrice.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <table className='w-full'>
                                        <tbody>
                                            <tr>
                                                <td className='font-medium py-2'>Subtotal</td>
                                                <td className='text-end py-2'>
                                                    {subtotal.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className='font-medium py-2'>Discount</td>
                                                <td className='text-end py-2'>
                                                    - {discount.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className='font-medium py-2'>Coupon Discount</td>
                                                <td className='text-end py-2'>
                                                    - {couponDiscountAmount.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className='font-medium py-2 text-xl'>Total</td>
                                                <td className='text-end py-2'>
                                                    {totalAmount.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className='mt-2 mb-5'>
                                        {!isCouponApplied
                                            ?
                                            <Form {...couponForm}>
                                                <form className='flex justify-between gap-5' onSubmit={couponForm.handleSubmit(applyCoupon)}>
                                                    <div className='w-[calc(100%-100px)]'>
                                                        <FormField
                                                            control={couponForm.control}
                                                            name='code'
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input placeholder="Enter coupon code" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className='w-[100px]'>
                                                        <ButtonLoading type="submit" text="Apply" className="w-full cursor-pointer" loading={couponLoading} />
                                                    </div>
                                                </form>
                                            </Form>
                                            :
                                            <div className='flex justify-between py-1 px-5 rounded-lg bg-gray-200'>
                                                <div>
                                                    <span className='text-xs'>Coupon:</span>
                                                    <p className='text-sm font-semibold'>{couponCode}</p>
                                                </div>
                                                <button type='button' onClick={removeCoupon} className='text-red-500 cursor-pointer'>
                                                    <IoCloseCircleSharp size={25} />
                                                </button>
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}

export default Checkout
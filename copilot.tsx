"use client";
import CheckoutForm from "@/components/molecules/checkout/CheckoutForm";
import CouponForm, {
  CouponData,
} from "@/components/molecules/checkout/CouponForm";
import PaymentMethods from "@/components/molecules/checkout/PaymentMethods";
import SkeletonDetailProduct from "@/components/molecules/checkout/SkeletonDetailProduct";
import { useGetHistory } from "@/hooks/useHistory";
import { useInstallment } from "@/hooks/useInstallment";
import { useOrder } from "@/hooks/useOrder";
import { useGetProductByCode } from "@/hooks/useProduct";
import { useGetInstitutionByID } from "@/hooks/useInstitution";
import {
  calculateDiscountPercentage,
  formatDate,
  formatRupiah,
  priceAfterDiscount,
} from "@/libs/utils";
import { Institution, ListHistory, ListProduct } from "@/types/response";
import {
  getProductCurrentPrice,
  getProductPrice,
  getProductPriceById,
  ProductPrice,
} from "@/utils/products-price";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BiCheck } from "react-icons/bi";
import Swal from "sweetalert2";
import LocationIcon from "@/components/icons/LocationIcon";
import { useRouter } from "next/navigation";

interface OrderPayload {
  payment_method: string;
  coupon_id?: string;
  items: {
    product_id: string;
    quantity: number;
    order_id?: string;
    price_id?: string;
  }[];
  user?: {
    name: string;
    email: string;
    phone: string;
  };
  installment?: {
    is_booking: boolean;
    amount: number;
  };
  institution_id?: string;
}

const CheckoutPage = () => {
  const { code } = useParams<{ code: string }>();
  const session = useSession();

  const [product, setProduct] = useState<ListProduct | null>(null);
  const [couponData, setCouponData] = useState<CouponData>();
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const { isLoading, createOrder } = useOrder();
  const { isLoading: isLoadingInstallment, createInstallment } =
    useInstallment();
  const [orderPayload, setOrderPayload] = useState<OrderPayload>({
    payment_method: "",
    items: [],
  });
  const [errMessage, setErrMessage] = useState<{
    name: string;
    phone: string;
    email: string;
  }>({
    name: "",
    phone: "",
    email: "",
  });
  const [isPPN, setIsPPN] = useState<boolean>(false);
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [subTotal, setSubTotal] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);

  const { isLoading: isGetProductLoading, getProductByCode } =
    useGetProductByCode();
  const { isLoading: isLoadingHistory, getHistoryByProductID } =
    useGetHistory();
  const [history, setHistory] = useState<ListHistory | null>(null);
  const { isLoading: isGetInstitutionLoading, getInstitutionByID } =
    useGetInstitutionByID();

  const [institution, setInstitution] = useState<Institution | null>(null);

  function renderTextInstallment(): React.ReactNode {
    const installments =
      history && history.history_installment
        ? history?.history_installment[0]?.installment_payment_detail
        : null;

    if (installments) {
      const unpaidInstallment = installments
        .filter((installment) => installment.status === "PENDING")
        .sort((a, b) => a.number - b.number)[0];
      if (unpaidInstallment) {
        return `Bayar Cicilan Ke-${unpaidInstallment.number}`;
      }
    }

    return "Bayar Cicilan";
  }

  const verifyOrderPayload = () => {
    const showError = (message: string, field?: keyof typeof errMessage) => {
      Swal.fire({
        position: "center",
        icon: "error",
        title: message,
        showConfirmButton: false,
        timer: 1500,
        backdrop: false,
      });
      if (field) {
        setErrMessage((prev) => ({
          ...prev,
          [field]: message,
        }));
      }
    };

    const validateUserDetails = () => {
      const { name, phone, email } = orderPayload.user || {};

      if (!name) {
        showError("Nama tidak boleh kosong", "name");
        return false;
      }
      if (!phone) {
        showError("Nomor telepon tidak boleh kosong", "phone");
        return false;
      }
      if (phone.length < 10) {
        showError("Nomor telepon tidak valid", "phone");
        return false;
      }
      if (!email) {
        showError("Email tidak boleh kosong", "email");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("Email tidak valid", "email");
        return false;
      }
      return true;
    };

    const validateOrderDetails = () => {
      if (!orderPayload.payment_method) {
        showError("Pilih metode pembayaran");
        return false;
      }
      if (!orderPayload.items[0]?.product_id) {
        showError("Coba Kembali");
        return false;
      }
      return true;
    };

    if (!validateUserDetails()) {
      return false;
    }

    if (!validateOrderDetails()) {
      return false;
    }

    return true;
  };

  const handleSignIn = async (
    email: string,
    password: string,
    paymentUrl: string
  ) => {
    setIsSigningIn(true);
    try {
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false, // Prevent automatic redirection
      });

      if (response?.error && response.error !== "Invalid password") {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Gagal membuat pesanan",
          text: "Silakan coba lagi",
          timer: 2000,
          confirmButtonColor: "#0F5298",
        });
      } else {
        // Redirect to payment page after successful sign-in
        window.location.href = paymentUrl;
      }
    } catch {
      throw new Error("Error during sign-in");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSubmit = () => {
    if (!verifyOrderPayload()) return;
    setIsSigningIn(true);
    // API call to create order
    orderPayload.items = orderPayload.items.filter(
      (item) => item.product_id && item.quantity
    );
    const order = {
      ...orderPayload,
      items: orderPayload.items,
    };
    createOrder(order)
      .then((data) => {
        if (data.data) {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Pesanan berhasil dibuat",
            text: "Mengalihkan ke halaman pembayaran ...",
            showConfirmButton: false,
            timer: 2000,
          }).then(() => {
            setIsSigningIn(true);
          });
          setTimeout(() => {
            if (!session.data?.user) {
              handleSignIn(
                data.data.user.email,
                data.data.user.password,
                data.data.payment.url
              );
            } else {
              window.location.href = data.data.payment.url;
            }
            setIsSigningIn(false);
          }, 2000);
        }
      })
      .catch(() => {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Gagal membuat pesanan",
          text: "Silakan coba lagi",
          timer: 2000,
          confirmButtonColor: "#0F5298",
        });
      });
    setIsSigningIn(false);
  };

  const handlePayInstallment = () => {
    if (!verifyOrderPayload()) return;
    // API call to create order
    createInstallment(
      orderPayload as {
        payment_method: string;
        items: {
          product_id: string;
          quantity: number;
          order_id: string;
        }[];
        user: {
          name: string;
          email: string;
          phone: string;
          company: string;
          position: string;
        };
      }
    )
      .then((data) => {
        if (data.data) {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Pembayaran berhasil dibuat",
            text: "Mengalihkan ke halaman pembayaran ...",
            showConfirmButton: false,
            timer: 2000,
          });
          setTimeout(() => {
            window.location.href = data.data.payment.url;
          }, 2000);
        }
      })
      .catch(() => {
        throw new Error("Failed to create installment payment");
      });
  };

  const searchParams = useSearchParams();
  const reffCode = searchParams.get("reff_code") || "";
  const installment = parseInt(searchParams.get("installment") || "0");
  const paket = searchParams.get("paket") || "";
  const pay_installment = searchParams.get("pay_installment") === "true";
  const institution_id = searchParams.get("location") || "";
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null);
  const institutionId = searchParams.get("location") || "";

  const router = useRouter();

  useEffect(() => {
    getProductByCode(code)
      .then((data) => {
        setProduct(data);
        const resPrice = paket
          ? getProductPriceById(data, paket)
          : getProductCurrentPrice(data);
        setSelectedPrice(resPrice);
        setSubTotal(Number(resPrice?.price || data.price));
      })
      .catch(() => {
        // throw new Error('Failed to get product code')
        Swal.fire({
          title: "Error",
          text: "Produk tidak ditemukan",
          icon: "warning",
        }).then(() => {
          router.push("/");
        });
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (institutionId) {
      getInstitutionByID(institutionId).then((data: Institution) => {
        setInstitution(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  // useeffect on couponData change

  useEffect(() => {
    if (couponData) {
      const price = product?.is_custom_price
        ? selectedPrice?.price.toString() || "0"
        : product?.price.toString() || "0";
      const discount = couponData.value;
      const discountType = couponData.value_type;
      const priceP = priceAfterDiscount(price, discount, discountType);
      setSubTotal(priceP);
    } else {
      setSubTotal(Number(selectedPrice?.price || product?.price || 0));
      setGrandTotal(Number(selectedPrice?.price || product?.price || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponData, selectedPrice]);

  // useeffect on subTotal change

  useEffect(() => {
    if (product && product.ppn > 0) {
      const ppn = product.ppn;
      const total = subTotal + (subTotal * ppn) / 100;
      setGrandTotal(total);
    } else {
      setGrandTotal(subTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTotal]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session.data?.user?.id || !product?.id) return;
      try {
        const data = await getHistoryByProductID(
          session.data.user.id,
          product.id
        );
        setHistory(data);
      } catch {
        throw new Error("Error fetching history");
      }
    };

    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    if (product) {
      setIsPPN(product.ppn > 0);
      setIsInstallment(
        (product.installment && product.installment.length > 0) ||
          (product.installment_price && product.installment_price.length > 0)
      );
      setOrderPayload({
        ...orderPayload,
        items: [
          {
            product_id: product.id,
            quantity: 1,
            order_id:
              history && history.history_installment
                ? history?.history_installment[0].order_id
                : undefined,
            price_id: paket ? paket : undefined,
          },
        ],
        installment:
          (product.installment &&
            product.installment.length > 0 &&
            installment > 0) ||
          (product.installment_price &&
            product.installment_price.length > 0 &&
            installment > 0)
            ? {
                amount: installment,
                is_booking: product.booking_fee > 0 ? true : false,
              }
            : undefined,
        institution_id: institution_id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, history]);

  return (
    <>
      <div className="p-6 shadow-xl bg-white flex items-center justify-center ">
        <Link href="/">
          <Image
            src="/images/logo-main.png"
            alt="Checkout"
            width={1920}
            height={1080}
            className="w-auto h-10 object-cover"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </Link>
      </div>
      <div className="bg-[#F1F2F8] min-h-screen flex items-center justify-center p-6">
        <div className="grid grid-cols-[1fr_400px] gap-3 w-full max-w-screen-lg max-md:grid-cols-1">
          <div className="flex flex-col gap-3">
            {!isGetProductLoading && product && !isGetInstitutionLoading ? (
              <div className="bg-white p-4 rounded-lg shadow-lg md:hidden">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={500}
                  height={500}
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <div className="py-3">
                  <div className="font-bold text-primaryText text-2xl">
                    {product.name}
                  </div>
                </div>
                {product.benefits && product.benefits.length > 0 && (
                  <div className="">
                    <div className="">
                      {product.benefits.map((item, index) => (
                        <div
                          className="grid grid-cols-[20px_1fr] gap-3 items-center mb-2"
                          key={index}
                        >
                          <div className="bg-green-600 w-5 aspect-square text-white flex items-center justify-center rounded-md">
                            <BiCheck />
                          </div>
                          <div className="text-sm">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {institution && (
                  <div className="py-3">
                    <div className="font-bold text-primaryText text-xl">
                      Lokasi Belajar
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 text-white flex items-center justify-center rounded-md mr-2">
                        <LocationIcon />
                      </div>
                      <div className="text-sm">{institution?.name}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="md:hidden">
                <SkeletonDetailProduct />
              </div>
            )}
            <CheckoutForm
              onFormChange={(data) => {
                setOrderPayload({
                  ...orderPayload,
                  user: data,
                });
                setErrMessage({
                  email: "",
                  name: "",
                  phone: "",
                });
              }}
              errMessage={errMessage}
            />

            <PaymentMethods
              onPaymentMethodChange={(paymentMethod) => {
                setOrderPayload({
                  ...orderPayload,
                  payment_method: paymentMethod,
                });
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            {!isGetProductLoading && product && !isGetInstitutionLoading ? (
              <div className="bg-white p-4 rounded-lg shadow-lg max-md:hidden">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={500}
                  height={500}
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <div className="py-3">
                  <div className="font-bold text-primaryText text-2xl">
                    {product.name}
                  </div>
                </div>
                {product.benefits && product.benefits.length > 0 && (
                  <div className="">
                    <div className="">
                      {product.benefits.map((item, index) => (
                        <div
                          className="grid grid-cols-[20px_1fr] gap-3 items-center mb-2"
                          key={index}
                        >
                          <div className="bg-green-600 w-5 aspect-square text-white flex items-center justify-center rounded-md">
                            <BiCheck />
                          </div>
                          <div className="text-sm">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {institution && (
                  <div className="py-3">
                    <div className="font-bold text-primaryText text-xl">
                      Lokasi Belajar
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 text-white flex items-center justify-center rounded-md mr-2">
                        <LocationIcon />
                      </div>
                      <div className="text-sm">{institution?.name}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <SkeletonDetailProduct />
            )}

            {/* Rincian Pesanan */}
            {!pay_installment ? (
              <div className="bg-white p-4 rounded-lg shadow-lg">
                {product && (
                  <CouponForm
                    onCouponApply={(coupon, couponData) => {
                      setOrderPayload((prevOrderPayload) => ({
                        ...prevOrderPayload,
                        installment:
                          (product.installment &&
                            product.installment.length > 0 &&
                            installment > 0) ||
                          (product.installment_price &&
                            product.installment_price.length > 0 &&
                            installment > 0)
                            ? {
                                amount: installment,
                                is_booking: product.booking_fee > 0,
                              }
                            : undefined,
                        coupon_id: coupon,
                      }));
                      setCouponData(couponData as CouponData);
                    }}
                    product_id={product?.id || ""}
                    reff_code={reffCode}
                  />
                )}

                <hr className="my-5" />

                <div className="grid grid-cols-1 gap-3 mt-3">
                  <div className="mt-2 text-primaryText text-xl font-semibold">
                    Rincian Pembayaran
                  </div>
                  {!isGetProductLoading && product ? (
                    <div className="grid grid-cols-[1fr_0.5fr] items-center">
                      <div className="">
                        <div className="text-sm text-orange-500">
                          {selectedPrice?.title}
                        </div>
                        <div>{product?.name}</div>
                      </div>
                      <div className="text-right font-semibold">
                        {formatRupiah(
                          product?.is_custom_price
                            ? selectedPrice?.price.toString() || "0"
                            : product?.price.toString()
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="">
                      <div className="grid grid-cols-[1fr_0.5fr] animate-pulse gap-3">
                        <div className="w-full h-6 bg-gray-200 rounded-lg"></div>
                        <div className="w-full h-6 bg-gray-200 rounded-lg"></div>
                      </div>
                    </div>
                  )}

                  {couponData && (
                    <>
                      <div className="grid grid-cols-[1fr_0.5fr]">
                        <div>
                          {couponData.code}{" "}
                          {couponData.value_type === "PERCENTAGE" && (
                            <span className="text-green-500 text-sm font-semibold">
                              ( -{couponData.value}% )
                            </span>
                          )}
                        </div>
                        <div className="text-right font-semibold text-green-500">
                          {couponData.value_type === "PERCENTAGE" ? (
                            <span>
                              -
                              {formatRupiah(
                                calculateDiscountPercentage(
                                  product?.is_custom_price
                                    ? selectedPrice?.price.toString() || "0"
                                    : getProductPrice(product),
                                  couponData.value.toString()
                                )
                              )}
                            </span>
                          ) : (
                            <span>
                              -{formatRupiah(couponData.value.toString())}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {isPPN && (
                    <div className="flex justify-between p-1 px-3 bg-zinc-100 rounded-md">
                      <div className="">Sub Total</div>
                      <div className="font-semibold">
                        {formatRupiah(subTotal.toString())}
                      </div>
                    </div>
                  )}

                  {isPPN && (
                    <div className="grid grid-cols-[1fr_0.5fr] items-center">
                      <div className="text-red-500">
                        <div>PPN {product?.ppn}% </div>
                      </div>
                      <div className="text-right font-semibold text-red-500">
                        +
                        {formatRupiah(
                          calculateDiscountPercentage(
                            subTotal.toString(),
                            product?.ppn.toString() || "0"
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {isInstallment && (
                    <div className="flex justify-between p-1 px-3 bg-zinc-100 rounded-md">
                      <div className="">Grand Total</div>
                      <div className="font-semibold">
                        {formatRupiah(grandTotal.toString())}
                      </div>
                    </div>
                  )}

                  {isInstallment && installment > 1 && (
                    <>
                      <div className="mt-2 text-primaryText text-xl font-semibold">
                        Rincian Cicilan ({installment}x)
                      </div>
                      {Array.from({
                        length: installment,
                      }).map((_, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[1fr_0.5fr] gap-3"
                        >
                          <div>Cicilan {index + 1}</div>
                          <div className="text-right font-semibold">
                            {product?.installment_price?.length
                              ? formatRupiah(
                                  product.installment_price
                                    .find((i) => i.installment === installment)
                                    ?.amount[index].toString() ?? "0"
                                )
                              : formatRupiah(
                                  Math.floor(
                                    grandTotal / installment
                                  ).toString()
                                )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {!isInstallment && !product?.booking_fee && (
                    <div className="grid grid-cols-[1fr_0.5fr] bg-zinc-200 p-3 rounded-md items-center">
                      <div className="text-zinc-600 font-semibold">
                        {product?.booking_fee
                          ? "Registration Fee"
                          : "Harga Total"}
                      </div>
                      <div className="text-right text-lg text-primaryText font-bold">
                        {formatRupiah(
                          product?.booking_fee
                            ? product.booking_fee.toString()
                            : grandTotal.toString()
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    className="bg-[#0F5298] hover:bg-[#0E4D8A] text-white py-2 rounded-md font-medium text-lg disabled:bg-blue-200"
                    disabled={isLoading || isSigningIn || isLoadingInstallment}
                  >
                    {isLoading || isSigningIn || isLoadingInstallment
                      ? "Memproses..."
                      : (product?.booking_fee ?? 0) > 0
                      ? `Daftar Sekarang`
                      : isInstallment
                      ? installment == 1
                        ? "Bayar Sekarang"
                        : "Bayar Cicilan 1"
                      : "Bayar Sekarang"}

                    <div className="text-sm font-normal">
                      {!isLoading &&
                        (product?.booking_fee ?? 0) > 0 &&
                        formatRupiah((product?.booking_fee || 0).toString())}
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-lg">
                {isLoadingHistory ? (
                  <div className="animate-pulse">
                    <div className="w-full h-6 bg-gray-200 rounded-lg"></div>
                    <div className="w-full h-6 bg-gray-200 rounded-lg"></div>
                    <div className="w-full h-6 bg-gray-200 rounded-lg"></div>
                  </div>
                ) : (
                  <div className="">
                    <div className="text-primaryText text-xl font-semibold">
                      Rincian Cicilan
                    </div>

                    {history?.history_installment?.map((installment) => (
                      <div key={installment.id} className="">
                        <div className="mt-2">
                          {installment.installment_payment_detail.map(
                            (detail) => (
                              <div
                                key={detail.id}
                                className="my-2 bg-white p-2 rounded-md"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    Cicilan Ke-
                                    {detail.number}
                                  </div>
                                  <div className="text-orange-500 font-semibold">
                                    {formatRupiah(
                                      detail.grand_total.toString()
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                  <div
                                    className={`text-sm px-2 ${
                                      detail.status === "SUCCESS"
                                        ? "bg-green-100 text-green-500"
                                        : "bg-red-100 text-red-500"
                                    }`}
                                  >
                                    {detail.status}
                                  </div>
                                  <div className="text-zinc-500 text-xs">
                                    Tenggat: {formatDate(detail.expired_date)}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => handlePayInstallment()}
                      className="bg-blue-500 hover:bg-blue-600 w-full text-white py-2 rounded-md font-semibold text-2xl disabled:bg-blue-200"
                      disabled={
                        isLoading || isSigningIn || isLoadingInstallment
                      }
                    >
                      {isLoading || isSigningIn || isLoadingInstallment
                        ? "Memproses..."
                        : renderTextInstallment()}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Product } from "@/types/product";
import { PlusCircle, MinusCircle } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUploader from "@/components/image-uploader";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  shadow_price: z
    .number()
    .min(0, "Shadow price must be non-negative")
    .optional(),
  category_id: z.string().uuid().optional(),
  benefits: z.array(z.string()),
  ppn: z.number().min(0).max(100, "PPN must be between 0 and 100"),
  is_custom_price: z.boolean(),
  booking_fee: z.number().min(0, "Booking fee must be non-negative"),
  interview: z.string().optional(),
  image_url: z.string().min(1, "Thumbnail is required"),
  product_price: z.array(
    z.object({
      title: z.string().optional(),
      desc: z.string().optional(),
      start_at: z.date().optional(),
      finish_at: z.date().optional(),
      price: z.number(),
    })
  ),
});

type ProductPrice = {
  title?: string;
  desc?: string;
  start_at?: Date;
  finish_at?: Date;
  price: number;
};

type ProductFormProps = {
  product?: Product & { product_price: ProductPrice[] };
  onSubmit: (data: z.infer<typeof productSchema>) => void;
  onDelete?: () => void;
};

export function ProductForm({ product, onSubmit, onDelete }: ProductFormProps) {
  const [benefits, setBenefits] = useState<string[]>(product?.benefits || []);
  const [newBenefit, setNewBenefit] = useState("");

  const { data: categories, isLoading: isLoadingCategory } = useCategories(
    1,
    "",
    99999999
  );

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      code: product?.code || "",
      description: product?.description || "",
      price: product?.price || 0,
      shadow_price: product?.shadow_price || 0,
      category_id: product?.category_id || "",
      benefits: product?.benefits || [],
      ppn: product?.ppn || 0,
      is_custom_price: product?.is_custom_price || false,
      booking_fee: product?.booking_fee || 0,
      image_url: product?.image_url || "",
      interview: product?.interview || "",
      product_price: product?.product_price || [],
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        code: product.code,
        description: product.description,
        price: product.price,
        shadow_price: product.shadow_price,
        category_id: product.category_id,
        benefits: product.benefits,
        ppn: product.ppn,
        is_custom_price: product.is_custom_price,
        booking_fee: product.booking_fee,
        image_url: product.image_url,
        interview: product.interview,
        product_price: product.product_price.map((price) => ({
          ...price,
          start_at: price.start_at ? new Date(price.start_at) : undefined,
          finish_at: price.finish_at ? new Date(price.finish_at) : undefined,
        })),
      });
      setBenefits(product.benefits);
    }
  }, [product, form]);

  const addBenefit = () => {
    if (newBenefit) {
      setBenefits([...benefits, newBenefit]);
      setNewBenefit("");
      form.setValue("benefits", [...benefits, newBenefit]);
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
    form.setValue(
      "benefits",
      benefits.filter((_, i) => i !== index)
    );
  };

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle>
          {product ? "Mengubah Produk" : "Menambahkan Produk"}
        </CardTitle>
        <CardDescription>Masukkan detail produk di bawah ini.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shadow_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Bayangan (Coret)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      {/* Select from categories */}

                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoadingCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ppn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PPN (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_custom_price"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Harga Khusus</FormLabel>
                    <FormDescription>
                      Aktifkan harga khusus untuk produk ini.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("is_custom_price") && (
              <>
                <div className="">Harga Produk</div>
                <div>
                  {form.watch("product_price")?.map((price, index) => (
                    <div key={index} className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name={`product_price.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Judul</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`product_price.${index}.desc`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deskripsi</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name={`product_price.${index}.start_at`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tanggal Mulai</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={
                                    field.value
                                      ? field.value instanceof Date
                                        ? field.value
                                            .toISOString()
                                            .split("T")[0]
                                        : field.value // Assuming field.value is already a string
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const date = e.target.value
                                      ? new Date(e.target.value)
                                      : null;
                                    field.onChange(date);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`product_price.${index}.finish_at`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tanggal Selesai</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={
                                    field.value
                                      ? field.value instanceof Date
                                        ? field.value
                                            .toISOString()
                                            .split("T")[0]
                                        : field.value // Assuming field.value is already a string
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const date = e.target.value
                                      ? new Date(e.target.value)
                                      : null;
                                    field.onChange(date);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`product_price.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Harga</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          const updatedPrices = form
                            .getValues("product_price")
                            .filter((_, i) => i !== index);
                          form.setValue("product_price", updatedPrices);
                        }}
                      >
                        Hapus Harga
                      </Button>
                      <Separator />
                    </div>
                  ))}
                  <Button
                    type="button"
                    className=""
                    onClick={() =>
                      form.setValue("product_price", [
                        ...form.getValues("product_price"),
                        {
                          title: "",
                          desc: "",
                          start_at: undefined,
                          finish_at: undefined,
                          price: 0,
                        },
                      ])
                    }
                  >
                    Tambahkan Harga
                  </Button>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="booking_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biaya Booking</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interview"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Interview</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <FormLabel>Benefits</FormLabel>
              <div className="flex space-x-2 mt-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add a benefit"
                />
                <Button type="button" onClick={addBenefit} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <ul className="mt-4 space-y-2">
                {benefits &&
                  benefits.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between p-2 bg-secondary rounded-md"
                    >
                      <span>{benefit}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBenefit(index)}
                      >
                        <MinusCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>

            <Separator />

            <div>
              <FormField
                control={form.control}
                name="image_url"
                render={() => (
                  <FormItem>
                    <FormLabel>Gambar Produk</FormLabel>
                    <ImageUploader
                      onUploaded={(url) => {
                        form.setValue("image_url", url);
                      }}
                      initialUrl={form.getValues("image_url")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
          {product ? "Mengubah Produk" : "Menambahkan Produk"}
        </Button>
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Menghapus Produk
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

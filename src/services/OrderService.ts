import { BuffVnDataSource } from "../dataSource";
import OrderEntity from "../entity/OrderEntity";
import { OrderPagingType, CreateOrderType, UpdateOrderType, OrderPaymentStatusType, OrderUpdateStatusType } from "../type/OrderType";
import { BaseResponseServiceType, DataResponseServiceType } from "../type/CommonType";
import { IBaseFilterRequestType } from "../type/IBaseFilterRequestType";
import Common from "../ultils/common";
import OrderProductEntity from "../entity/OrderProductEntity";
import ProductEntity from "../entity/ProductEntity";
import SizeProductEntity from "../entity/SizeProductEntity";
import ProductService from "./ProductService";

export default class OrderService {
    private alias: string = "order"
    public async GetById(id: number, relationOrderProduct: boolean = true) {
        let result = await BuffVnDataSource.getRepository(OrderEntity).findOne({
            where: {
                id
            },
            relations: {
                orderProducts: relationOrderProduct
            }
        });
        
        return result;
    }
    public async GetByDetailId(id: number, relationOrderProduct: boolean = true) {
        let result = await BuffVnDataSource.getRepository(OrderEntity).findOne({
            where: {
                id
            },
            relations: {
                orderProducts: {product:relationOrderProduct,size:relationOrderProduct},
            }
        });
        
        return result;
    }

    public async GetDetail(id: number) {
        const result: DataResponseServiceType<any> = {
            status: true,
            errors: [],
            data: {}
        }
        if (!id) {
            result.status = false
            result.errors.push("Mã không được rỗng")
        }
        if (!result.status) return result;

        let order = await this.GetByDetailId(id) as any;

        if (!order) {
            result.status = false;
            result.errors.push("Không tồn tại thông tin này!");
        }
        if (!result.status) return result;

        result.data = order;
        return result;
    }

    public async GetOrderPaging(query: IBaseFilterRequestType) {

        let pageData: OrderPagingType<any> = {} as any;
        pageData.currentPage = query?.page ?? 1;
        pageData.pageSize = query?.pageSize ?? 10;
        let recordsToSkip = (query.page - 1) * pageData.pageSize;
        let queryData = BuffVnDataSource.createQueryBuilder(OrderEntity, this.alias);
        if (query.keySearch)
            queryData = queryData.where(`${this.alias}.orderCode like :orderCode`, { orderCode: `%${query.keySearch}%` });

        if (query.status)
            queryData = queryData.where(`${this.alias}.status like :status`, { status: `%${query.status}%` });

        pageData.total = await queryData.getCount();

        pageData.datas = await queryData.offset(recordsToSkip)
            .limit(query.pageSize)
            .leftJoin(`${this.alias}.guest`, 'guest')
            .select(`${this.alias}.id`, `id`)
            .addSelect(`${this.alias}.orderCode`, `orderCode`)
            .addSelect(`${this.alias}.guestId`, `guestId`)
            .addSelect([`guest.fullName`, `guest.phone`])
            .addSelect(`${this.alias}.totalPrice`, `totalPrice`)
            .addSelect(`${this.alias}.shippingAddress`, `shippingAddress`)
            .addSelect(`${this.alias}.shippingFee`, `shippingFee`)
            .addSelect(`${this.alias}.shippingMethod`, `shippingMethod`)
            .addSelect(`${this.alias}.shippingProvinceId`, `shippingProvinceId`)
            .addSelect(`${this.alias}.shippingDistrictId`, `shippingDistrictId`)
            .addSelect(`${this.alias}.shippingWardId`, `shippingWardId`)
            .addSelect(`${this.alias}.paymentMethod`, `paymentMethod`)
            .addSelect(`${this.alias}.status`, `status`)
            .addSelect(`${this.alias}.createdAt`, `createdAt`)
            .addSelect(`${this.alias}.updatedAt`, `updatedAt`)
            .getRawMany();

        const result: DataResponseServiceType<any> = {
            status: true,
            errors: [],
            data: pageData
        };
        return result;
    }
    public async CreateOrder(data: CreateOrderType) {
        const result: DataResponseServiceType<any> = {
            status: true,
            errors: [],
            data: {}
        }
        if (!data?.orderCode) {
            result.status = false
            result.errors.push("Mã hóa đơn không được rỗng")
        }
        if (!data?.guestId) {
            result.status = false
            result.errors.push("Khách hàng không được rỗng")
        }
        if (data?.totalPrice <= 0) {
            result.status = false
            result.errors.push("Giá không hợp lệ")
        }
        if (!data?.shippingAddress) {
            result.status = false
            result.errors.push("Địa chỉ không được rỗng")
        }
        // if (!data?.note) {
        //     result.status = false
        //     result.errors.push("Ghi chú không được rỗng")
        // }

        // if (data?.shippingFee<=0) {
        //     result.status = false
        //     result.errors.push("Giá Shipping không hợp lệ")
        // }

        // if (!data?.discountCode) {
        //     result.status = false
        //     result.errors.push("Mã khuyến mãi không được rỗng")
        // }
        // if (data?.discountFee<=0) {
        //     result.status = false
        //     result.errors.push("Giá khuyến mãi không hợp lệ")
        // }

        if (!result.status) return result;

        let productOrderEntities = data?.items.map(x => new OrderProductEntity({
            product: {
                id: x.productId
            } as any,
            quantity: x.quantity,
            size: {
                id: x.sizeId
            } as any,
            currentPrice: x.currentPrice,
            updatedAt: new Date(),
            createdAt: new Date(),
            status: 'active',
        }))
        productOrderEntities = await BuffVnDataSource.getRepository(OrderProductEntity).save(productOrderEntities);

        let order = new OrderEntity({
            orderCode: data.orderCode,
            guestId: data.guestId,
            totalPrice: data.totalPrice,
            shippingAddress: data.shippingAddress,
            note: data.note,
            shippingFee: data.shippingFee,
            discountCode: data.discountCode,
            discountFee: data.discountFee,

            shippingMethod: data.shippingMethod,
            shippingProvinceId: data.shippingProvinceId,
            shippingDistrictId: data.shippingDistrictId,
            shippingWardId: data.shippingWardId,
            paymentMethod: data.paymentMethod,

            updatedAt: new Date(),
            createdAt: new Date(),
            status: data.status,
            orderProducts: productOrderEntities
        })
        await BuffVnDataSource.getRepository(OrderEntity).save(order);
        result.data = order;
        return result;
    }

    public async UpdateOrder(data: UpdateOrderType): Promise<BaseResponseServiceType> {
        const result: BaseResponseServiceType = {
            status: true,
            errors: []
        }
        let id = data?.id;
        if (!id) {
            result.status = false
            result.errors.push("Mã không được rỗng")
        }

        if (!data?.orderCode) {
            result.status = false
            result.errors.push("Mã hóa đơn không được rỗng")
        }
        if (!data?.guestId) {
            result.status = false
            result.errors.push("Khách hàng không được rỗng")
        }
        if (data?.totalPrice <= 0) {
            result.status = false
            result.errors.push("Giá không hợp lệ")
        }
        if (!data?.shippingAddress) {
            result.status = false
            result.errors.push("Địa chỉ không được rỗng")
        }
        // if (!data?.note) {
        //     result.status = false
        //     result.errors.push("Ghi chú không được rỗng")
        // }

        // if (data?.shippingFee<=0) {
        //     result.status = false
        //     result.errors.push("Giá Shipping không hợp lệ")
        // }

        // if (!data?.discountCode) {
        //     result.status = false
        //     result.errors.push("Mã khuyến mãi không được rỗng")
        // }
        // if (data?.discountFee<=0) {
        //     result.status = false
        //     result.errors.push("Giá khuyến mãi không hợp lệ")
        // }

        if (!result.status) return result;

        let order = await this.GetById(id);
        if (!order) {
            result.status = false;
            result.errors.push("Không tồn tại thông tin này!");
        }
        if (!result.status) return result;

        await BuffVnDataSource.getRepository(OrderEntity).update({ id }, data as any);
        return result;
    }

    public async UpdateOrderStatus(data: OrderUpdateStatusType): Promise<BaseResponseServiceType> {
        const result: BaseResponseServiceType = {
            status: true,
            errors: []
        }
        let id = data?.id;
        if (!id) {
            result.status = false
            result.errors.push("Mã không được rỗng")
        }
        if (!data?.status) {
            result.status = false
            result.errors.push("Tình trạng không được rỗng")
        }
        if (!data?.note) {
            result.status = false
            result.errors.push("Ghi chú không được rỗng")
        }
        if (!result.status) return result;

        let order = await this.GetById(id, false);
        if (!order) {
            result.status = false;
            result.errors.push("Không tồn tại thông tin này!");
        }
        if (order.status == "recieved") {
            result.status = false;
            result.errors.push("Đơn hàng này đã kết thúc!");
        }
        if (!result.status) return result;
        order.note = data.note;
        order.status = data.status;
        order.updatedAt = new Date();
        await BuffVnDataSource.getRepository(OrderEntity).update({ id }, order);
        return result;
    }

    public async PaymentSuccess(data: OrderPaymentStatusType): Promise<BaseResponseServiceType> {
        const result: BaseResponseServiceType = {
            status: true,
            errors: []
        }
        let id = data?.orderId;
        if (!id) {
            result.status = false
            result.errors.push("Mã không được rỗng")
        }

        if (!result.status) return result;

        let order = await this.GetById(id, false);
        if (!order) {
            result.status = false;
            result.errors.push("Không tồn tại thông tin này!");
        }

        if (order.status != "new") {
            result.status = false;
            result.errors.push("Đơn hàng này đã hết hạn!");
        }
        if (!result.status) return result;

        order.status = 'paid';
        order.updatedAt = new Date();
        await BuffVnDataSource.getRepository(OrderEntity).update({ id }, order);
        return result;
    }

    public async PaymentCancel(data: OrderPaymentStatusType): Promise<BaseResponseServiceType> {
        const result: BaseResponseServiceType = {
            status: true,
            errors: []
        }
        let id = data?.orderId;
        if (!id) {
            result.status = false
            result.errors.push("Mã không được rỗng")
        }

        if (!result.status) return result;

        let order = await this.GetById(id, false);
        if (!order) {
            result.status = false;
            result.errors.push("Không tồn tại thông tin này!");
        }

        if (order.status != "new") {
            result.status = false;
            result.errors.push("Đơn hàng này đã hết hạn!");
        }
        if (!result.status) return result;

        order.status = 'cancel';
        order.updatedAt = new Date();
        await BuffVnDataSource.getRepository(OrderEntity).update({ id }, order);
        return result;
    }

    public async DeleteOrder(id: number): Promise<BaseResponseServiceType> {
        const result: BaseResponseServiceType = {
            status: true,
            errors: []
        }
        if (!id) {
            result.status = false
            result.errors.push("Mã không được rỗng")
        }
        if (!result.status) return result;

        let order = await BuffVnDataSource.getRepository(OrderEntity).findOne({
            where: { id: id }
        });

        if (!order) {
            result.status = false;
            result.errors.push("Không tồn tại thông tin này!");
        }
        if (!result.status) return result;

        await BuffVnDataSource.getRepository(OrderEntity).delete({ id });
        return result;
    }


}
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '@/helpers/util';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  isEmailExist = async (email: string) => {
    const user = await this.userModel.exists({ email });
    if (user) return true;
    return false;
  };

  async create(createUserDto: CreateUserDto) {
    const { email, password, name, phone, address, image } = createUserDto;
    //check email exist
    const isEmailExist = await this.isEmailExist(email);
    if (isEmailExist) {
      throw new BadRequestException(
        `Email đã tồn tại: ${email}. Vui lòng chọn email khác4`,
      );
    }
    //hash password
    const hashPassword = await hashPasswordHelper(password);
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      phone,
      address,
      image,
    });
    return {
      _id: user._id,
    };
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { CodeAuthDto, CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private mailerService: MailerService,
  ) {}

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
        `Email đã tồn tại: ${email}. Vui lòng chọn email khác`,
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

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, limit, sort } = aqp(query);

    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;

    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (current - 1) * pageSize;

    const result = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .select('-password')
      .sort(sort as any);

    return { result, totalPages };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id },
      { ...updateUserDto },
    );
  }

  async remove(_id: string) {
    //check id
    if (mongoose.isValidObjectId(_id)) {
      return await this.userModel.deleteOne({ _id });
    } else {
      throw new BadRequestException('Id không hợp lệ');
    }
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { email, password, name } = registerDto;
    //check email exist
    const isEmailExist = await this.isEmailExist(email);
    if (isEmailExist) {
      throw new BadRequestException(
        `Email đã tồn tại: ${email}. Vui lòng chọn email khác`,
      );
    }
    //hash password
    const hashPassword = await hashPasswordHelper(password);
    const codeId = uuidv4();
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      isActive: false,
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes'),
    });
    //send email
    this.mailerService.sendMail({
      to: user.email, // list of receivers
      subject: 'Active your account at @duchuy',
      template: 'register', // `.hbs` extension is appended automatically
      context: {
        // ✏️ filling curly brackets with content
        name: user?.name ?? user.email,
        activationCode: codeId,
      },
    });
    //trả phản hồi
    return {
      _id: user._id,
    };
  }

  async handleActive(data: CodeAuthDto) {
    const user = await this.userModel.findOne({
      _id: data._id,
      codeId: data.code,
    });

    if (!user) {
      throw new BadRequestException('Mã Code không hợp lệ hoặc đã hết hạn');
    }

    //check code expired
    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheck) {
      //validate code
      await this.userModel.updateOne(
        {
          _id: data._id,
        },
        {
          isActive: true,
        },
      );
      return { isBeforeCheck };
    } else {
      throw new BadRequestException('Mã Code đã hết hạn');
    }
  }

  async retryActive(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }
    const codeId = uuidv4();

    // update user
    await user.updateOne({
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes'),
    });

    //send email
    this.mailerService.sendMail({
      to: user.email, // list of receivers
      subject: 'Active your account at @duchuy',
      template: 'register', // `.hbs` extension is appended automatically
      context: {
        // ✏️ filling curly brackets with content
        name: user?.name ?? user.email,
        activationCode: codeId,
      },
    });

    return { _id: user._id };
  }
}

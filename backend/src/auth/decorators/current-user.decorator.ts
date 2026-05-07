import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Request['user'] => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

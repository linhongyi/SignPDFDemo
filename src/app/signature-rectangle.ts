import { TouchObjectType } from './touch-object-type.enum'

export interface edgePoint{
    x:number;
    y:number;
}

export class SignatureRectangle {

    private minimalDistance: number = 20;
    public touchPoint: edgePoint = {x:0,y:0};

    constructor(public startX: number, public startY: number, public endX: number, public endY: number, public pageIndex:number) {

    };

    width(): number {
        return Math.abs(this.endX - this.startX);
    }

    height(): number {
        return Math.abs(this.endY - this.startY);
    }

    isHit(x: number, y: number): boolean {
        var result = false;

        do {

            if (x < Math.min(this.startX, this.endX)) {
                break;
            }

            if (x > Math.max(this.startX, this.endX)) {
                break;
            }

            if (y < Math.min(this.startY, this.endY)) {
                break;
            }

            if (y > Math.max(this.startY, this.endY)) {
                break;
            }

            result = true;
        } while (0);

        return result;
    }


    getTouchType(x: number, y: number): TouchObjectType {

        var type = TouchObjectType.None;

        let testShiftAllEdges = [
            {x:this.startX,y:this.startY},
            {x:this.endX,y:this.startY},
            {x:this.endX,y:this.endY},
            {x:this.startX,y:this.endY}
        ];

        let testShiftXEdges = [
            {x:this.startX,y:(this.startY+this.endY)/2},
            {x:this.endX,y:(this.startY+this.endY)/2}
        ];

        let testShiftYEdges = [
            {x:(this.startX+this.endX)/2,y:this.startY},
            {x:(this.startX+this.endX)/2,y:this.endY}
        ];

        var blockself = this;

        if(testShiftAllEdges.some(function(element, index, arry){
            if (Math.sqrt((x - element.x) * (x - element.x) + (y - element.y) * (y - element.y)) < blockself.minimalDistance) {
                blockself.touchPoint = {x:element.x,y:element.y};
                return true;
            }
        })==true)
        {
            type = TouchObjectType.ShiftAllDirection;
        }
        else if(testShiftXEdges.some(function(element, index, arry){
            if (Math.sqrt((x - element.x) * (x - element.x) + (y - element.y) * (y - element.y)) < blockself.minimalDistance) {
                blockself.touchPoint = {x:element.x,y:element.y};
                return true;
            }
        })==true)
        {
            type = TouchObjectType.ShiftXDirection;
        }
        else if(testShiftYEdges.some(function(element, index, arry){
            if (Math.sqrt((x - element.x) * (x - element.x) + (y - element.y) * (y - element.y)) < blockself.minimalDistance) {
                blockself.touchPoint = {x:element.x,y:element.y};
                return true;
            }
        })==true)
        {
            type = TouchObjectType.ShiftYDirection;
        }
        else if(this.isHit(x,y)==true)
        {
            type = TouchObjectType.Move;
        }

        return type;
    }

    
    shiftEdgeForDirection(dx:number, dy:number):void{

        if(this.startX==this.touchPoint.x)
        {
            this.startX += dx;
            this.touchPoint.x = this.startX;
        }
        else
        {
            this.endX += dx;
            this.touchPoint.x = this.endX;
        }

        if(this.startY==this.touchPoint.y)
        {
            this.startY += dy;
            this.touchPoint.y = this.startY;
        }
        else
        {
            this.endY += dy;
            this.touchPoint.y = this.endY;
        }
    }
}

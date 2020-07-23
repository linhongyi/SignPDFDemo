import { Component, ViewChild } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import { Subscription, fromEvent, from } from 'rxjs';
import { SignatureRectangle, edgePoint } from './signature-rectangle'
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { FileSaverService } from 'ngx-filesaver';
import { TouchObjectType } from './touch-object-type.enum'
import SignaturePad from 'signature_pad'
import { FileServiceService } from './file-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {

  @ViewChild('signature-pad') canvas: HTMLCanvasElement;

  imageEncodingString: string;
  signatureRectangle: SignatureRectangle;
  mapUtility: TouchObjectType;
  downPoint: edgePoint;

  public signaturePad: SignaturePad;
  public canvasOffsetX: number;
  public canvasOffsetY: number;

  public canvasWidth: number;
  public canvasHeight: number;
  public canvasLeft: number = 0;
  public canvasTop: number = 0;
  public edgeRadius: number = 10;

  public signaturePadWidth: number = 0;
  public signaturePadHeight: number = 0;

  public saveURL: string;
  private pageRendering: boolean;
  private pdfDoc: any;
  private pdfScale: number = 1;
  private pageNumPending = null;
  public pageNum: number = 1;
  public totalPageNum: number = 0;

  mouseMoveSubscription: Subscription;
  mouseUpSubscription: Subscription;
  mouseDownSubscription: Subscription;

  title = 'PDFSignatureDemo';

  constructor(private fileSaverService: FileSaverService, private downLoadFileService: FileServiceService) {
    this.canvasWidth = 0;
    this.canvasHeight = 0;
  }


  ngOnInit() {


    this.canvas = <HTMLCanvasElement>document.getElementById('signature-pad');

    this.signaturePad = new SignaturePad(this.canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: 'rgb(0, 0, 0)'
    });

    window.addEventListener("resize", this.resizeCanvas);

    this.signatureRectangle = new SignatureRectangle(0, 0, 0, 0, 0);

    var blockself = this;
    var signatureRectangle = this.signatureRectangle;


    this.mouseMoveSubscription = fromEvent(document.getElementById('signature-canvas'), 'mousemove').subscribe((e: MouseEvent) => {
      // console.log('mousemove', e);
      e.preventDefault();
      e.stopPropagation();

      let canvas = document.getElementById('signature-canvas').getBoundingClientRect();
      this.canvasOffsetX = canvas.left;
      this.canvasOffsetY = canvas.top;

      if (this.mapUtility == TouchObjectType.Drag) {
        this.signatureRectangle.endX = e.clientX - this.canvasOffsetX;
        this.signatureRectangle.endY = e.clientY - this.canvasOffsetY;

        this.clear();
        this.drawRect();
      }
      else if (this.mapUtility == TouchObjectType.Move) {

        var dx = e.clientX - this.canvasOffsetX - this.downPoint.x;
        var dy = e.clientY - this.canvasOffsetY - this.downPoint.y;

        if (Math.min(this.signatureRectangle.startX, this.signatureRectangle.endX) + dx < 0) {
          dx = -Math.min(this.signatureRectangle.startX, this.signatureRectangle.endX);
        }

        if (Math.max(this.signatureRectangle.startX, this.signatureRectangle.endX) + dx > this.canvasWidth) {
          dx = this.canvasWidth - Math.max(this.signatureRectangle.startX, this.signatureRectangle.endX);
        }

        if (Math.min(this.signatureRectangle.startY, this.signatureRectangle.endY) + dy < 0) {
          dy = -Math.min(this.signatureRectangle.startY, this.signatureRectangle.endY);
        }

        if (Math.max(this.signatureRectangle.startY, this.signatureRectangle.endY) + dy > this.canvasHeight) {
          dy = this.canvasHeight - Math.max(this.signatureRectangle.startY, this.signatureRectangle.endY);
        }

        this.signatureRectangle.startX += dx;
        this.signatureRectangle.startY += dy;
        this.signatureRectangle.endX += dx;
        this.signatureRectangle.endY += dy;

        this.downPoint.x = e.clientX - this.canvasOffsetX;
        this.downPoint.y = e.clientY - this.canvasOffsetY;

        this.clear();
        this.drawRect();
      }
      else if (this.mapUtility == TouchObjectType.ShiftAllDirection ||
        this.mapUtility == TouchObjectType.ShiftXDirection ||
        this.mapUtility == TouchObjectType.ShiftYDirection) {

        var dx = e.clientX - this.canvasOffsetX - this.downPoint.x;
        var dy = e.clientY - this.canvasOffsetY - this.downPoint.y;

        if (this.signatureRectangle.touchPoint.x + dx < 0) {
          dx = -this.signatureRectangle.touchPoint.x;
        }

        if (this.signatureRectangle.touchPoint.x + dx > this.canvasWidth) {
          dx = this.canvasWidth - this.signatureRectangle.touchPoint.x;
        }

        if (this.signatureRectangle.touchPoint.y + dy < 0) {
          dy = -this.signatureRectangle.touchPoint.y;
        }

        if (this.signatureRectangle.touchPoint.y + dy > this.canvasHeight) {
          dy = this.canvasHeight - this.signatureRectangle.touchPoint.y;
        }

        if (this.mapUtility == TouchObjectType.ShiftXDirection) {
          dy = 0;
        }
        else if (this.mapUtility == TouchObjectType.ShiftYDirection) {
          dx = 0;
        }

        this.signatureRectangle.shiftEdgeForDirection(dx, dy);

        this.downPoint.x = e.clientX - this.canvasOffsetX;
        this.downPoint.y = e.clientY - this.canvasOffsetY;

        this.clear();
        this.drawRect();
      }
    });

    this.mouseUpSubscription = fromEvent(document.getElementById('signature-canvas'), 'mouseup').subscribe((e) => {
      // console.log('mouseup', e);

      e.preventDefault();
      e.stopPropagation();

      this.mapUtility = TouchObjectType.None;

    });

    this.mouseDownSubscription = fromEvent(document.getElementById('signature-canvas'), 'mousedown').subscribe((e: MouseEvent) => {
      // console.log('mousedown', e);

      e.preventDefault();
      e.stopPropagation();

      this.signatureRectangle.pageIndex = this.pageNum;
      
      let canvas = document.getElementById('signature-canvas').getBoundingClientRect();
      this.canvasOffsetX = canvas.left;
      this.canvasOffsetY = canvas.top;

      this.downPoint = {
        x: e.clientX - this.canvasOffsetX,
        y: e.clientY - this.canvasOffsetY,
      };

      this.mapUtility = this.signatureRectangle.getTouchType(this.downPoint.x, this.downPoint.y);

      if (this.mapUtility == TouchObjectType.None) {

        this.mapUtility = TouchObjectType.Drag;
        this.signatureRectangle.startX = e.clientX - this.canvasOffsetX;
        this.signatureRectangle.startY = e.clientY - this.canvasOffsetY;
      }
    });
  }


  ngOnDestroy() {
    this.mouseMoveSubscription.unsubscribe();
    this.mouseUpSubscription.unsubscribe();
    this.mouseDownSubscription.unsubscribe();
  }


  ngAfterViewInit() {

    // this.signaturePad.set('canvasWidth', 800);
    // this.signaturePad.set('canvasHeight', 200);
    // this.signaturePad.clear(); // invoke functions from szimek/signature_pad API
  }


  onLoadPDF(url: string): void {

    this.saveURL = url;

    var blockself = this;

    const pdfjsWorker = import('pdfjs-dist/build/pdf.worker.entry');

    pdfjsWorker.then((value) => {


      pdfjsLib.GlobalWorkerOptions.workerSrc = value;

      // Asynchronous download of PDF
      var loadingTask = pdfjsLib.getDocument(url);
      loadingTask.promise.then(function (pdf) {

        blockself.pdfDoc = pdf;
        blockself.totalPageNum = blockself.pdfDoc.numPages;

        console.log("pdf:", pdf, "totalPageNums:", blockself.pdfDoc.numPages);

        // Fetch the first page
        var pageNumber = 1;

        pdf.getPage(pageNumber).then(function (page) {

          var viewport = page.getViewport({ scale: blockself.pdfScale });

          // Prepare canvas using PDF page dimensions
          var canvas = <HTMLCanvasElement>document.getElementById('pdf-canvas');
          var context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          blockself.canvasWidth = viewport.width;
          blockself.canvasHeight = viewport.height;
          blockself.signaturePadWidth = viewport.width;
          blockself.signaturePadHeight = 200;

          blockself.canvasLeft = (screen.width - viewport.width) / 2;
          blockself.canvasTop = 350;

          // Render PDF page into canvas context
          var renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          var renderTask = page.render(renderContext);
          renderTask.promise.then(function () {
            blockself.resizeCanvas();
          });
        });
      }, function (reason) {
        // PDF loading error
        console.error(reason);
      });
    });
  }


  renderPage(num: number) {

    console.log('renderPage', this.pdfDoc);

    var blockself = this;

    this.pageRendering = true;

    // Using promise to fetch the page
    this.pdfDoc.getPage(num).then(function (page) {
      var viewport = page.getViewport({ scale: blockself.pdfScale });

      var canvas = <HTMLCanvasElement>document.getElementById('pdf-canvas');
      var context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      var renderTask = page.render(renderContext);

      // Wait for rendering to finish
      renderTask.promise.then(function () {
        blockself.pageRendering = false;
        if (blockself.pageNumPending !== null) {
          // New page rendering is pending
          blockself.renderPage(blockself.pageNumPending);
          blockself.pageNumPending = null;
        }
        else {
          blockself.drawRect();
        }
      });
    });
  }


  drawRect(): void {

    console.log(this.pageNum,this.signatureRectangle.pageIndex);

    if (this.pageNum != this.signatureRectangle.pageIndex) {
      this.clear();
      return;
    }

    var c = <HTMLCanvasElement>document.getElementById("signature-canvas");

    var ctx = c.getContext("2d");
    ctx.fillStyle = "#676767";
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    ctx.moveTo(this.signatureRectangle.startX, this.signatureRectangle.startY);
    ctx.lineTo(this.signatureRectangle.endX, this.signatureRectangle.startY);
    ctx.lineTo(this.signatureRectangle.endX, this.signatureRectangle.endY);
    ctx.lineTo(this.signatureRectangle.startX, this.signatureRectangle.endY);
    ctx.lineTo(this.signatureRectangle.startX, this.signatureRectangle.startY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.signatureRectangle.startX,
      this.signatureRectangle.startY, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc((this.signatureRectangle.startX + this.signatureRectangle.endX) / 2,
      this.signatureRectangle.startY, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.signatureRectangle.endX,
      this.signatureRectangle.startY, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.signatureRectangle.endX,
      (this.signatureRectangle.startY + this.signatureRectangle.endY) / 2, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.signatureRectangle.endX,
      this.signatureRectangle.endY, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc((this.signatureRectangle.startX + this.signatureRectangle.endX) / 2,
      this.signatureRectangle.endY, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.signatureRectangle.startX,
      this.signatureRectangle.endY, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.signatureRectangle.startX,
      (this.signatureRectangle.startY + this.signatureRectangle.endY) / 2, this.edgeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.closePath();

    let imageData = this.signaturePad.toDataURL();

    console.log('pageNum:', this.pageNum, 'pageIndex:', this.signatureRectangle.pageIndex);

    if (imageData.length > 0) {
      var image = new Image();
      image.src = imageData;

      ctx.drawImage(image,
        Math.min(this.signatureRectangle.startX, this.signatureRectangle.endX) + 1,
        Math.min(this.signatureRectangle.startY, this.signatureRectangle.endY) + 1,
        this.signatureRectangle.width() - 1,
        this.signatureRectangle.height() - 1
      );
    }

  }


  savePdf(): void {
    const url = this.saveURL;

    fetch(url).then(res => res.arrayBuffer()).then(
      (existingPdfBytes) => {
        PDFDocument.load(existingPdfBytes).then((pdfDoc) => {
          pdfDoc.embedFont(StandardFonts.Helvetica).then((helveticaFont) => {
            const pages = pdfDoc.getPages();
            const firstPage = pages[this.pageNum-1];
            const { width, height } = firstPage.getSize()

            console.log(this.signaturePad.toDataURL());

            pdfDoc.embedPng(this.signaturePad.toDataURL()).then((pngImage) => {

              // firstPage.drawImage(pngImage, {
              //   x: Math.min(this.signatureRectangle.startX,this.signatureRectangle.endX)*Math.min(width,this.signatureRectangle.width())/Math.max(width,this.signatureRectangle.width()),
              //   y: Math.min(this.signatureRectangle.startY,this.signatureRectangle.endY)*Math.min(height,this.signatureRectangle.height())/Math.max(height,this.signatureRectangle.height()),
              //   width: this.signatureRectangle.width()*Math.min(width,this.signatureRectangle.width())/Math.max(width,this.signatureRectangle.width()),
              //   height: this.signatureRectangle.height()*Math.min(height,this.signatureRectangle.height())/Math.max(height,this.signatureRectangle.height())
              // });

              firstPage.drawImage(pngImage, {
                x: Math.min(this.signatureRectangle.startX, this.signatureRectangle.endX),
                y: this.canvasHeight - Math.min(this.signatureRectangle.startY, this.signatureRectangle.endY) - this.signatureRectangle.height(),
                width: this.signatureRectangle.width(),
                height: this.signatureRectangle.height()
              });

            });

            pdfDoc.save().then((pdfBytes) => {
              // Trigger the browser to download the PDF document
              // download(pdfBytes, "pdf-lib_creation_example.pdf", "application/pdf");

              const fileType = this.fileSaverService.genType('pdf-lib_creation_example.pdf');
              const txtBlob = new Blob([pdfBytes], { type: fileType });
              this.fileSaverService.save(txtBlob, 'pdf-lib_creation_example.pdf');

              console.log(txtBlob);
            });

          })
        })
      }
    )
  }


  clear(): void {
    var c = <HTMLCanvasElement>document.getElementById("signature-canvas");
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  }


  drawComplete() {
    // will be notified of szimek/signature_pad's onEnd event
  }


  drawStart() {
    // will be notified of szimek/signature_pad's onBegin event
    console.log('begin drawing');
  }


  drawClear() {
    this.signaturePad.clear();
  }


  resizeCanvas() {

    var canvas = <HTMLCanvasElement>document.getElementById('signature-pad')

    var ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    this.signaturePad.clear();
  }


  upload(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    var fr = new FileReader();
    var blockself = this;

    fr.onload = function () {
      blockself.onLoadPDF(<string>fr.result);
    }
    fr.readAsDataURL(file);
  }


  downloadFile(url: string) {
    var blockself = this;

    this.downLoadFileService.downloadFile(url).subscribe(res => {

      var fr = new FileReader();

      fr.onload = function () {
        blockself.onLoadPDF(<string>fr.result);
      }
      fr.readAsDataURL(res.body);

    });
  }


  queueRenderPage(num) {
    console.log('queueRenderPage:', num);

    if (this.pageRendering) {
      this.pageNumPending = num;
    } else {
      this.renderPage(num);
    }
  }


  onClickPreviousePage() {
    if (this.pageNum <= 1) {
      return;
    }
    this.pageNum--;
    this.queueRenderPage(this.pageNum);
  }


  onClickNextPage() {
    if (this.pageNum >= this.pdfDoc.numPages) {
      return;
    }
    this.pageNum++;
    this.queueRenderPage(this.pageNum);
  }
}

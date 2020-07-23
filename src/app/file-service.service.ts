import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { FileSaverService } from 'ngx-filesaver';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileServiceService {

  constructor(private httpClient: HttpClient, private fileSaver: FileSaverService) {

  }

  downloadFile(url: string): Observable<HttpResponse<Blob>> {

    var headers = new HttpHeaders();

    headers = headers.set('Access-Control-Allow-Origin', ['https://www.w3.org', 'http://localhost:4200']);

    console.log(headers.getAll('Access-Control-Allow-Origin'));

    return this.httpClient.get(url, {
      headers: headers,
      observe: 'response',
      responseType: 'blob'
    });
  }
}
